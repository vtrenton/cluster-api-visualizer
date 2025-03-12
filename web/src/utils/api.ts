import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

export const fetchManagementCluster = async () => {
  try {
    const response = await api.get('/management-cluster');
    return response.data;
  } catch (error) {
    console.error('Error fetching management cluster:', error);
    throw error;
  }
};

export const fetchClusterDetails = async (clusterName: string, namespace: string) => {
  try {
    const response = await api.get(`/describe-cluster?cluster=${clusterName}&namespace=${namespace}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching cluster details:', error);
    throw error;
  }
};

export const fetchResourceLogs = async (resourceType: string, resourceName: string, namespace: string, maxLines: string) => {
  try {
    const response = await api.get(`/logs?resourceType=${resourceType}&resourceName=${resourceName}&namespace=${namespace}&maxLines=${maxLines}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching resource logs:', error);
    throw error;
  }
};

export const fetchVersion = async () => {
  try {
    const response = await api.get('/version');
    return response.data;
  } catch (error) {
    console.error('Error fetching version:', error);
    throw error;
  }
};

export default api; 