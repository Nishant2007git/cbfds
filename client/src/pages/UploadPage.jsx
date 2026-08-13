import React from 'react';
import Layout from '../components/Layout.jsx';
import UploadZone from '../components/UploadZone.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const UploadPage = () => {
  const { refreshUserData } = useAuth();

  return (
    <Layout title="Resumable Upload Zone">
      <UploadZone onUploadComplete={refreshUserData} />
    </Layout>
  );
};

export default UploadPage;
