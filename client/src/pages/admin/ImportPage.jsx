import React from 'react';
import { useNavigate } from 'react-router-dom';
import ImportCustomerModal from '../../components/ImportCustomerModal';

export default function ImportPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <ImportCustomerModal
        onSuccess={() => navigate('/admin/customers')}
        onClose={() => navigate('/admin/customers')}
      />
    </div>
  );
}
