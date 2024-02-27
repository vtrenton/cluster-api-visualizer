package internal

import (
	"context"
	"fmt"
	"sort"
	"strings"

	visualizerv1 "github.com/Jont828/cluster-api-visualizer/api/v1"
	"github.com/gobuffalo/flect"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/klog/v2/klogr"
	clusterv1 "sigs.k8s.io/cluster-api/api/v1beta1"
	"sigs.k8s.io/cluster-api/cmd/clusterctl/client"
	"sigs.k8s.io/cluster-api/cmd/clusterctl/client/tree"
	"sigs.k8s.io/cluster-api/controllers/external"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
)

// ClusterResourceNode represents a node in the Cluster API resource tree and is used to configure the frontend with additional
// options like collapsibility and provider.
type ClusterResourceNode struct {
	Name        string                 `json:"name"`
	Namespace   string                 `json:"namespace"`
	DisplayName string                 `json:"displayName"`
	Kind        string                 `json:"kind"`
	Group       string                 `json:"group"`
	Version     string                 `json:"version"`
	Provider    string                 `json:"provider"`
	UID         string                 `json:"uid"`
	Collapsible bool                   `json:"collapsible"`
	Collapsed   bool                   `json:"collapsed"`
	Ready       bool                   `json:"ready"`
	Severity    string                 `json:"severity"`
	HasReady    bool                   `json:"hasReady"`
	Children    []*ClusterResourceNode `json:"children"`
}

type ClusterResourceTreeOptions struct {
	GroupMachines                bool
	AddControlPlaneVirtualNode   bool
	KindsToCollapse              map[string]struct{}
	VNodesToInheritChildProvider map[string]struct{}
}

// ConstructClusterResourceTree returns a tree with nodes representing the Cluster API resources in the Cluster.
// Note: ObjectReferenceObjects do not have the virtual annotation so we can assume that all virtual objects are collapsible
func ConstructClusterResourceTree(defaultClient client.Client, runtimeClient ctrlclient.Client, dcOptions client.DescribeClusterOptions) (*ClusterResourceNode, *HTTPError) {
	objTree, err := defaultClient.DescribeCluster(dcOptions)
	if err != nil {
		if strings.HasSuffix(err.Error(), "not found") {
			return nil, &HTTPError{Status: 404, Message: err.Error()}
		}

		return nil, NewInternalError(err)
	}

	treeOptions := ClusterResourceTreeOptions{
		GroupMachines:              true,
		AddControlPlaneVirtualNode: true,
		KindsToCollapse: map[string]struct{}{
			"TemplateGroup":           {},
			"ClusterResourceSetGroup": {},
		},
		VNodesToInheritChildProvider: map[string]struct{}{
			"ClusterResourceSetGroup": {},
			// "WorkerGroup":             {},
		},
	}

	if err := injectCustomResourcesToObjectTree(runtimeClient, dcOptions, objTree); err != nil {
		return nil, NewInternalError(err)
	}

	resourceTree := objectTreeToResourceTree(objTree, objTree.GetRoot(), treeOptions)

	return resourceTree, nil
}

// objectTreeToResourceTree converts an clusterctl ObjectTree to a ClusterResourceNode tree.
func objectTreeToResourceTree(objTree *tree.ObjectTree, object ctrlclient.Object, treeOptions ClusterResourceTreeOptions) *ClusterResourceNode {
	log := klogr.New()

	if object == nil {
		return nil
	}

	group := object.GetObjectKind().GroupVersionKind().Group
	kind := object.GetObjectKind().GroupVersionKind().Kind
	version := object.GetObjectKind().GroupVersionKind().Version

	_, collapsed := treeOptions.KindsToCollapse[kind]
	node := &ClusterResourceNode{
		Name:        object.GetName(),
		DisplayName: getDisplayName(object),
		Kind:        kind,
		Group:       group,
		Version:     version,
		Collapsible: tree.IsVirtualObject(object),
		Collapsed:   collapsed,
		Children:    []*ClusterResourceNode{},
		UID:         string(object.GetUID()),
	}
	if node.Namespace = object.GetNamespace(); node.Namespace == "" {
		node.Namespace = "default"
	}

	children := objTree.GetObjectsByParent(object.GetUID())
	provider, err := getProvider(object, children, treeOptions)
	if err != nil {
		log.Error(err, "failed to get provider for object", "kind", kind, "name", object.GetName())
	}
	node.Provider = provider

	setReadyFields(object, node)

	childTrees := []*ClusterResourceNode{}
	for _, child := range children {
		// log.Info("Child UID is ", "UID", child.GetUID())
		// obj := objTree.GetObject(child.GetUID())
		// log.Info("Obj is", "obj", obj)
		childTrees = append(childTrees, objectTreeToResourceTree(objTree, child, treeOptions))
	}

	log.V(4).Info("Node is", "node", node.Kind+"/"+node.Name)
	if treeOptions.GroupMachines {
		node.Children = createKindGroupNode(object.GetNamespace(), "Machine", "cluster", childTrees, false)
	} else {
		node.Children = childTrees
	}

	sort.Slice(node.Children, func(i, j int) bool {
		// TODO: make sure this is deterministic!
		if getSortKeys(node.Children[i])[0] == getSortKeys(node.Children[j])[0] {
			return getSortKeys(node.Children[i])[1] < getSortKeys(node.Children[j])[1]
		}
		return getSortKeys(node.Children[i])[0] < getSortKeys(node.Children[j])[0]
	})

	if treeOptions.AddControlPlaneVirtualNode && tree.GetMetaName(object) == "ControlPlane" {
		parent := &ClusterResourceNode{
			Name:        "control-plane-parent",
			Namespace:   object.GetNamespace(),
			DisplayName: "ControlPlane",
			Kind:        kind,
			Provider:    "virtual", // TODO: should this be provider=controlplane or provider=virtual?
			Group:       group,
			Version:     version,
			Collapsible: true,
			Collapsed:   false,
			Children:    []*ClusterResourceNode{node},
			UID:         "control-plane-parent",
		}

		return parent
	}

	return node
}

// createKindGroupNode finds all objects in children with `kind` and create a parent node for them.
func createKindGroupNode(namespace string, kind string, provider string, children []*ClusterResourceNode, groupForOne bool) []*ClusterResourceNode {
	log := klogr.New()

	log.V(4).Info("Starting children are ", "children", nodeArrayNames(children))

	resultChildren := []*ClusterResourceNode{}
	groupNode := &ClusterResourceNode{
		Name:        "",
		Namespace:   namespace,
		DisplayName: "",
		Kind:        kind,
		Provider:    provider, // TODO: don't hardcode this
		Collapsible: true,
		Collapsed:   true,
		Children:    []*ClusterResourceNode{},
		HasReady:    false,
		Ready:       true,
		Severity:    "",
		UID:         kind + ": ",
	}

	for _, child := range children {
		if child.Kind == kind {
			groupNode.Group = child.Group
			groupNode.Version = child.Version
			groupNode.Children = append(groupNode.Children, child)
			groupNode.UID += child.UID + " "
			if child.HasReady {
				groupNode.HasReady = true
				groupNode.Ready = child.Ready && groupNode.Ready
				groupNode.Severity = updateSeverityIfMoreSevere(groupNode.Severity, child.Severity)
				// Set severity based on most severe child, i.e. Error > Warning > Info > Success
			}
		} else {
			resultChildren = append(resultChildren, child)
		}
	}

	if len(groupNode.Children) > 1 {
		groupNode.DisplayName = fmt.Sprintf("%d %s", len(groupNode.Children), flect.Pluralize(kind))
		resultChildren = append(resultChildren, groupNode)
	} else if len(groupNode.Children) == 1 && groupForOne {
		groupNode.DisplayName = fmt.Sprintf("1 %s", kind)
		resultChildren = append(resultChildren, groupNode)
	} else {
		resultChildren = append(resultChildren, groupNode.Children...)
	}

	log.V(4).Info("Result children are ", "children", nodeArrayNames(resultChildren))

	return resultChildren
}

// injectCustomResourcesToObjectTree amends the clusterctl ObjectTree with custom CRDs that are not included in the clusterctl resource discovery.
// It queries all CRD types and their instances containing the visualizer label and the cluster name label.
func injectCustomResourcesToObjectTree(c ctrlclient.Client, dcOptions client.DescribeClusterOptions, objTree *tree.ObjectTree) error {
	ctx := context.Background()

	crds, err := getCRDList(ctx, c)
	if err != nil {
		return err
	}

	namespace := dcOptions.Namespace
	clusterName := dcOptions.ClusterName

	clusterObjects := map[types.UID]unstructured.Unstructured{}

	for _, crd := range crds {
		for _, version := range crd.Spec.Versions {
			typeMeta := metav1.TypeMeta{
				Kind: crd.Spec.Names.Kind,
				APIVersion: metav1.GroupVersion{
					Group:   crd.Spec.Group,
					Version: version.Name,
				}.String(),
			}

			clusterObjList := new(unstructured.UnstructuredList)
			clusterObjSelector := []ctrlclient.ListOption{
				ctrlclient.InNamespace(namespace),
				ctrlclient.HasLabels{visualizerv1.VisualizeResourceLabel},
				ctrlclient.MatchingLabels{clusterv1.ClusterNameLabel: clusterName},
			}
			if err := getObjList(ctx, c, typeMeta, clusterObjSelector, clusterObjList); err != nil {
				return err
			}

			for _, obj := range clusterObjList.Items {
				clusterObjects[obj.GetUID()] = obj
			}

		}
	}

	for i := range clusterObjects {
		object := clusterObjects[i]
		// Make sure not to implicitly reference loop variable!
		if err := ensureObjConnectedTotree(c, objTree, &object); err != nil {
			return err
		}
	}

	return nil
}

// ensureObjConnectedTotree ensures that the object is connected to the tree by adding it and its parents until a parent is owned by the Cluster (root node).
// If a parent has no owner, it is set as a child of the Cluster.
// Note: At the moment, this only supports a use case where an object has only one owner which is also set the controller.
func ensureObjConnectedTotree(c ctrlclient.Client, objTree *tree.ObjectTree, object ctrlclient.Object) error {
	log := klogr.New()
	if objTree.GetObject(object.GetUID()) != nil || objTree.GetRoot().GetUID() == object.GetUID() {
		log.V(4).Info("Object already in tree", "kind", object.GetObjectKind().GroupVersionKind().Kind, "name", object.GetName(), "namespace", object.GetNamespace())
		return nil
	}

	log.V(4).Info("Adding object to tree", "kind", object.GetObjectKind().GroupVersionKind().Kind, "name", object.GetName(), "namespace", object.GetNamespace())
	var parent ctrlclient.Object
	// TODO: handle case where there is no controllerRef or how to resolve multiple owners.
	controllerRef := metav1.GetControllerOf(object)
	if controllerRef != nil {
		ref := &corev1.ObjectReference{
			APIVersion: controllerRef.APIVersion,
			Kind:       controllerRef.Kind,
			Name:       controllerRef.Name,
			Namespace:  object.GetNamespace(),
		}
		// We could instead try to cache the list of objects from earlier, but that gets complicated when trying to deal with non-cluster objects.
		if p, err := external.Get(context.Background(), c, ref, object.GetNamespace()); err != nil {
			return err
		} else {
			parent = p
		}
	} else {
		// If no ownerRef, set to root.
		parent = objTree.GetRoot()
		// TODO: look into creating an add-ons virtual node.
	}

	ensureObjConnectedTotree(c, objTree, parent)

	added, _ := objTree.Add(parent, object)
	if !added {
		return fmt.Errorf("failed to add object %s to tree", object.GetName())
	}

	return nil
}
