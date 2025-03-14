<template>
  <div
    class="tree-container"
    ref="container"
  >
    <svg
      class="svg vue-tree"
      ref="svg"
      :style="initialTransformStyle"
    ></svg>

    <div
      class="dom-container"
      ref="domContainer"
      :style="initialTransformStyle"
    >
      <transition-group
        name="tree-node-item"
        tag="div"
      >
        <div
          class="node-slot"
          v-for="(node, index) of nodeDataList"
          :key="node.data._key"
          :style="{
            left: formatDimension(
              direction === DIRECTION.VERTICAL ? node.x : node.y
            ),
            top: formatDimension(
              direction === DIRECTION.VERTICAL ? node.y : node.x
            ),
            width: formatDimension(config.nodeWidth),
            height: formatDimension(config.nodeHeight)
          }"
        >
          <slot
            name="node"
            v-bind:node="node.data"
            v-bind:collapsed="node.data._collapsed"
            v-bind:index="index"
            v-bind:collapseNode="collapseNode"
          >
            <!-- 默认展示value字段 -->
            <span>{{ node.data.value }}</span>
          </slot>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";

const MATCH_TRANSLATE_REGEX = /translate\((-?\d+)px, ?(-?\d+)px\)/i;
const MATCH_SCALE_REGEX = /scale\((\S*)\)/i;

const LinkStyle = {
  CURVE: "curve",
  STRAIGHT: "straight",
};

const DIRECTION = {
  VERTICAL: "vertical",
  HORIZONTAL: "horizontal",
};

const DEFAULT_NODE_WIDTH = 100;
const DEFAULT_NODE_HEIGHT = 100;
const DEFAULT_LEVEL_HEIGHT = 200;
/**
 * Used to decrement the height of the 'initTransformY' to center diagrams.
 * This is only a hotfix caused by the addition of '__invisible_root' node
 * for multi root purposes.
 */
const DEFAULT_HEIGHT_DECREMENT = 100;

const ANIMATION_DURATION = 800;

const ZOOM_INCREMENT = 0.1;

function rotatePoint({ x, y }) {
  return {
    x: y,
    y: x,
  };
}

export default {
  name: "vue-tree",
  props: {
    config: {
      type: Object,
      default: () => {
        return {
          nodeWidth: DEFAULT_NODE_WIDTH,
          nodeHeight: DEFAULT_NODE_HEIGHT,
          levelHeight: DEFAULT_LEVEL_HEIGHT,
        };
      },
    },
    linkStyle: {
      type: String,
      default: LinkStyle.CURVE,
    },
    direction: {
      type: String,
      default: DIRECTION.VERTICAL,
    },
    collapseEnabled: {
      type: Boolean,
      default: true,
    },
    // 展示的层级数据, 样例数据如: hierachical.json
    dataset: {
      type: [Object, Array],
      required: true,
    },
  },
  data() {
    return {
      d3,
      colors: "568FE1",
      nodeDataList: [],
      linkDataList: [],
      initTransformX: 0,
      initTransformY: 0,
      DIRECTION,
      currentScale: 1,
    };
  },
  computed: {
    initialTransformStyle() {
      return {
        transform: `scale(1) translate(${this.initTransformX}px, ${this.initTransformY}px)`,
        transformOrigin: "center",
      };
    },
    _dataset() {
      return this.updatedInternalData(this.dataset);
    },
    _linkStyle() {
      return this.linkStyle;
    },
  },
  mounted() {
    this.init();
  },
  methods: {
    uuid() {
      const s = [];
      const hexDigits = "0123456789abcdef";
      for (let i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
      }
      s[14] = "4";
      s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
      s[8] = s[13] = s[18] = s[23] = "-";
      return s.join("");
    },
    init() {
      this.draw();
      this.enableDrag();
      this.initTransform();
    },
    zoomIn() {
      const originTransformStr = this.$refs.domContainer.style.transform;
      // 如果已有scale属性, 在原基础上修改
      let targetScale = 1;
      // let targetScale = 1 * 1.2;
      const scaleMatchResult = originTransformStr.match(MATCH_SCALE_REGEX);
      if (scaleMatchResult && scaleMatchResult.length > 0) {
        const originScale = parseFloat(scaleMatchResult[1]);
        targetScale = originScale + ZOOM_INCREMENT;
        // targetScale *= originScale;
      }
      this.setScale(targetScale);
    },
    zoomOut() {
      const originTransformStr = this.$refs.domContainer.style.transform;
      // 如果已有scale属性, 在原基础上修改
      let targetScale = 1;
      // let targetScale = 1 / 1.2;
      const scaleMatchResult = originTransformStr.match(MATCH_SCALE_REGEX);
      if (scaleMatchResult && scaleMatchResult.length > 0) {
        const originScale = parseFloat(scaleMatchResult[1]);
        if (originScale > ZOOM_INCREMENT) 
          targetScale = originScale - 0.1;
        else 
          targetScale = originScale;
        // targetScale = originScale / 1.2;
      }
      this.setScale(targetScale);
    },
    restoreScale() {
      this.setScale(1);
    },
    setScale(scaleNum) {
      if (typeof scaleNum !== "number") return;
      let pos = this.getTranslate();
      let translateString = `translate(${pos[0]}px, ${pos[1]}px)`;
      this.$refs.svg.style.transform = `scale(${scaleNum}) ` + translateString;
      this.$refs.domContainer.style.transform =
        `scale(${scaleNum}) ` + translateString;
      this.currentScale = scaleNum;
      this.$emit("scale", scaleNum);
    },
    getTranslate() {
      let string = this.$refs.svg.style.transform;
      let match = string.match(MATCH_TRANSLATE_REGEX);
      if (match === null) {
        return [null, null];
      }
      let x = parseInt(match[1]);
      let y = parseInt(match[2]);
      return [x, y];
    },
    isVertical() {
      return this.direction === DIRECTION.VERTICAL;
    },
    /**
     * Returns updated dataset by deep copying every nodes from the externalData and adding unique '_key' attributes.
     **/
    updatedInternalData(externalData) {
      var data = { name: "__invisible_root", children: [] };
      // console.log("External data: ", externalData);
      if (!externalData) return data;
      if (Array.isArray(externalData)) {
        for (var i = externalData.length - 1; i >= 0; i--) {
          data.children.push(this.deepCopy(externalData[i]));
          // console.log("Array child", data.children[i]);
        }
      } else {
        data.children.push(this.deepCopy(externalData));
        // console.log("Normal child", data.children);
      }
      // console.log("Data is ", data);
      return data;
    },
    /**
     * Returns a deep copy of selected node (copy of itself and it's children).
     * If selected node or it's children have no '_key' attribute it will assign a new one.
     **/
    deepCopy(node) {
      let obj = { _key: this.uuid() };
      for (var key in node) {
        if (node[key] === null) {
          obj[key] = null;
        } else if (Array.isArray(node[key])) {
          obj[key] = node[key].map((x) => this.deepCopy(x));
        } else if (typeof node[key] === "object") {
          obj[key] = this.deepCopy(node[key]);
        } else {
          obj[key] = node[key];
        }
      }
      if ("collapsed" in node && node["collapsible"] && node["collapsed"]) {
        obj["_children"] = obj["children"];
        obj["children"] = null;
        obj["_collapsed"] = true;
      }
      // console.log("Object is", obj);
      return obj;
    },
    initTransform() {
      const containerWidth = this.$refs.container.offsetWidth;
      const containerHeight = this.$refs.container.offsetHeight;
      if (this.isVertical()) {
        this.initTransformX = Math.floor(containerWidth / 2);
        this.initTransformY = Math.floor(
          this.config.nodeHeight - DEFAULT_HEIGHT_DECREMENT
        );
      } else {
        this.initTransformX = Math.floor(
          this.config.nodeWidth - DEFAULT_HEIGHT_DECREMENT
        );
        this.initTransformY = Math.floor(containerHeight / 2);
      }
    },
    /**
     * 根据link数据,生成svg path data
     */
    generateLinkPath(d) {
      const self = this;
      if (this.linkStyle === LinkStyle.CURVE) {
        const linkPath = this.isVertical()
          ? d3.linkVertical()
          : d3.linkHorizontal();
        linkPath
          .x(function (d) {
            return d.x;
          })
          .y(function (d) {
            return d.y;
          })
          .source(function (d) {
            const sourcePoint = {
              x: d.source.x,
              y: d.source.y,
            };
            return self.direction === self.DIRECTION.VERTICAL
              ? sourcePoint
              : rotatePoint(sourcePoint);
          })
          .target(function (d) {
            const targetPoint = {
              x: d.target.x,
              y: d.target.y,
            };
            return self.direction === self.DIRECTION.VERTICAL
              ? targetPoint
              : rotatePoint(targetPoint);
          });
        return linkPath(d);
      }
      if (this.linkStyle === LinkStyle.STRAIGHT) {
        // the link path is: source -> secondPoint -> thirdPoint -> target
        const linkPath = d3.path();
        let sourcePoint = { x: d.source.x, y: d.source.y };
        let targetPoint = { x: d.target.x, y: d.target.y };
        if (!this.isVertical()) {
          sourcePoint = rotatePoint(sourcePoint);
          targetPoint = rotatePoint(targetPoint);
        }
        const xOffset = targetPoint.x - sourcePoint.x;
        const yOffset = targetPoint.y - sourcePoint.y;
        const secondPoint = this.isVertical()
          ? { x: sourcePoint.x, y: sourcePoint.y + yOffset / 2 }
          : { x: sourcePoint.x + xOffset / 2, y: sourcePoint.y };
        const thirdPoint = this.isVertical()
          ? { x: targetPoint.x, y: sourcePoint.y + yOffset / 2 }
          : { x: sourcePoint.x + xOffset / 2, y: targetPoint.y };
        linkPath.moveTo(sourcePoint.x, sourcePoint.y);
        linkPath.lineTo(secondPoint.x, secondPoint.y);
        linkPath.lineTo(thirdPoint.x, thirdPoint.y);
        linkPath.lineTo(targetPoint.x, targetPoint.y);
        return linkPath.toString();
      }
    },
    // 使用扇形数据开始绘图
    draw() {
      var [nodeDataList, linkDataList] = this.buildTree(this._dataset);
      // Do not render the invisible root node.
      nodeDataList.splice(0, 1);
      linkDataList = linkDataList.filter(
        (x) => x.source.data.name !== "__invisible_root"
      );
      this.linkDataList = linkDataList;
      this.nodeDataList = nodeDataList;
      const identifier = this.dataset["identifier"];
      const specialLinks = this.dataset["links"];

      if (specialLinks && identifier) {
        for (const link of specialLinks) {
          let parent,
            children = undefined;
          if (identifier === "value") {
            parent = this.nodeDataList.find((d) => {
              return d[identifier] == link.parent;
            });
            children = this.nodeDataList.filter((d) => {
              return d[identifier] == link.child;
            });
          } else {
            parent = this.nodeDataList.find((d) => {
              return d["data"][identifier] == link.parent;
            });
            children = this.nodeDataList.filter((d) => {
              return d["data"][identifier] == link.child;
            });
          }
          if (parent && children) {
            for (const child of children) {
              const new_link = Object.assign(
                {
                  source: parent,
                  target: child,
                },
                link.styles
              );
              this.linkDataList.push(new_link);
            }
          }
        }
      }

      this.svg = this.d3.select(this.$refs.svg);

      const self = this;
      const links = this.svg.selectAll(".link").data(linkDataList, (d) => {
        return `${d.source.data._key}-${d.target.data._key}`;
      });

      links
        .enter()
        .append("path")
        .style("opacity", 0)
        .transition()
        .duration(ANIMATION_DURATION)
        .ease(d3.easeCubicInOut)
        .style("opacity", 1)
        .style("stroke", (d, i) => d.stroke)
        .style("stroke-width", (d, i) => d["stroke-width"])
        .style("stroke-dashoffset", (d, i) => d["stroke-dashoffset"])
        .style("stroke-dasharray", (d, i) => d["stroke-dasharray"])
        .style("stroke-linecap", (d, i) => d["stroke-linecap"])
        .attr("class", "link")
        .attr("d", function (d, i) {
          return self.generateLinkPath(d);
        });
      links
        .transition()
        .duration(ANIMATION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr("d", function (d) {
          return self.generateLinkPath(d);
        });
      links
        .exit()
        .transition()
        .duration(ANIMATION_DURATION / 2)
        .ease(d3.easeCubicInOut)
        .style("opacity", 1)
        .style("stroke", (d, i) => "")
        .style("stroke-width", (d, i) => "")
        .style("stroke-dashoffset", (d, i) => "")
        .style("stroke-dasharray", (d, i) => "")
        .style("stroke-linecap", (d, i) => "")
        .style("opacity", 0)
        .remove();
    },
    buildTree(rootNode) {
      const treeBuilder = this.d3
        .tree()
        .nodeSize([this.config.nodeWidth, this.config.levelHeight])
        .separation(function separation(a, b) {
          // return a.parent == b.parent ? 1 : 2;
          // Reduce separation of subtrees at higher depths. At depth 0, separation is 2 and asymptotically approaches 1.
          return a.parent == b.parent ? 1 : 1 + 1 / (a.depth + 1);
        });
      const tree = treeBuilder(this.d3.hierarchy(rootNode));
      return [tree.descendants(), tree.links()];
    },
    enableDrag() {
      const svgElement = this.$refs.svg;
      const container = this.$refs.container;
      let startX = 0;
      let startY = 0;
      let isDrag = false;
      // 保存鼠标点下时的位移
      let mouseDownTransform = "";
      container.onmousedown = (event) => {
        mouseDownTransform = svgElement.style.transform;
        startX = event.clientX;
        startY = event.clientY;
        isDrag = true;
      };
      container.onmousemove = (event) => {
        if (!isDrag) return;
        const originTransform = mouseDownTransform;
        let originOffsetX = 0;
        let originOffsetY = 0;
        if (originTransform) {
          const result = originTransform.match(MATCH_TRANSLATE_REGEX);
          if (result !== null && result.length !== 0) {
            const [offsetX, offsetY] = result.slice(1);
            originOffsetX = parseInt(offsetX);
            originOffsetY = parseInt(offsetY);
          }
        }
        let newX =
          Math.floor((event.clientX - startX) / this.currentScale) +
          originOffsetX;
        let newY =
          Math.floor((event.clientY - startY) / this.currentScale) +
          originOffsetY;
        let transformStr = `translate(${newX}px, ${newY}px)`;
        if (originTransform) {
          transformStr = originTransform.replace(
            MATCH_TRANSLATE_REGEX,
            transformStr
          );
        }
        svgElement.style.transform = transformStr;
        this.$refs.domContainer.style.transform = transformStr;
      };

      container.onmouseup = (event) => {
        startX = 0;
        startY = 0;
        isDrag = false;
      };
    },
    collapseNode(index) {
      if (this.collapseEnabled) {
        const curNode = this.nodeDataList[index];
        // TODO: is this needed if we are not calling this on every node?
        if (!curNode.data.collapsible) return;
        if (curNode.data.children) {
          curNode.data._children = curNode.data.children;
          curNode.data.children = null;
          curNode.data._collapsed = true;
        } else {
          curNode.data.children = curNode.data._children;
          curNode.data._children = null;
          curNode.data._collapsed = false;
        }

        this.draw();
      }
    },
    formatDimension(dimension) {
      if (typeof dimension === "number") return `${dimension}px`;
      if (dimension.indexOf("px") !== -1) {
        return dimension;
      } else {
        return `${dimension}px`;
      }
    },
    parseDimensionNumber(dimension) {
      if (typeof dimension === "number") {
        return dimension;
      }
      return parseInt(dimension.replace("px", ""));
    },
  },
  watch: {
    _dataset: {
      deep: true,
      handler: function () {
        this.draw();
        this.initTransform();
      },
    },
    _linkStyle: {
      deep: true,
      handler: function () {
        this.draw();
        this.initTransform();
      },
    },
  },
};
</script>

<style lang="less">
.tree-container {
  .node {
    fill: grey;
  }

  .link {
    stroke-width: 2px;
    fill: transparent;
    stroke: #555;
  }
}
</style>

<style lang="less" scoped>
.tree-node-item-enter,
.tree-node-item-leave-to {
  transition-timing-function: ease-in-out;
  transition: transform 0.8s;
  opacity: 0;
}

.tree-node-item-enter-active,
.tree-node-item-leave-active {
  transition-timing-function: ease-in-out;
  transition: all 0.8s;
}

.tree-container {
  position: relative;
  overflow: hidden;

  .vue-tree {
    position: relative;
  }

  > svg,
  .dom-container {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    transform-origin: 0 50%;
  }

  .dom-container {
    z-index: 1;
    pointer-events: none;
  }
}

.node-slot {
  pointer-events: all;
  position: absolute;
  background-color: transparent;
  box-sizing: border-box;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: content-box;
  transition: all 0.8s;
  transition-timing-function: ease-in-out;
}
</style>
