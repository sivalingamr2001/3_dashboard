/**
 * Example: How to use API integration in React components
 * 
 * This file demonstrates common patterns for using the API integration
 * with React Query hooks in real components.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useEmployees, 
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee 
} from '@/core/query/useEmployees';
import { 
  useAccessRequests,
  useCreateAccessRequest 
} from '@/core/query/useAccessRequests';

// ============================================
// Example 1: Basic Data Fetching
// ============================================
export function EmployeeListExample() {
  const { data: employees, isLoading, error } = useEmployees();

  if (isLoading) return <div>Loading employees...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <ul>
      {employees?.map(emp => (
        <li key={emp.userId}>
          {emp.displayName} ({emp.department})
        </li>
      ))}
    </ul>
  );
}

// ============================================
// Example 2: Mutation with Error Handling
// ============================================
export function CreateEmployeeExample() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    department: '',
    employeeId: '',
    role: 'User'
  });

  const createMutation = useCreateEmployee();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      setFormData({ 
        email: '', password: '', displayName: '', 
        department: '', employeeId: '', role: 'User' 
      });
      // Toast/notification: "Employee created successfully"
    } catch (error) {
      // Toast/notification: "Failed to create employee"
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={e => setFormData({ ...formData, email: e.target.value })}
        disabled={createMutation.isPending}
      />
      {/* More form fields... */}
      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create Employee'}
      </button>
      {createMutation.error && (
        <p className="error">{(createMutation.error as Error).message}</p>
      )}
    </form>
  );
}

// ============================================
// Example 3: Conditional Data Fetching
// ============================================
export function EmployeeDetailsExample({ employeeId }: { employeeId: number }) {
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employees', employeeId],
    queryFn: async () => {
      // Call API here
      const response = await fetch(`/api/employees/${employeeId}`);
      return response.json();
    },
    // Only fetch if we have an ID
    enabled: !!employeeId
  });

  if (!employeeId) return <div>No employee selected</div>;
  if (isLoading) return <div>Loading details...</div>;

  return (
    <div>
      <h2>{employee?.displayName}</h2>
      <p>Department: {employee?.department}</p>
      <p>Role: {employee?.role}</p>
    </div>
  );
}

// ============================================
// Example 4: Optimistic Updates
// ============================================
export function UpdateEmployeeExample({ employeeId }: { employeeId: number }) {
  const [newName, setNewName] = useState('');
  const updateMutation = useUpdateEmployee();

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        id: employeeId,
        request: { displayName: newName }
      });
      setNewName('');
      // Toast: "Employee updated successfully"
    } catch (error) {
      // Toast: "Failed to update employee"
      console.error(error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={newName}
        onChange={e => setNewName(e.target.value)}
        placeholder="New name"
        disabled={updateMutation.isPending}
      />
      <button 
        onClick={handleUpdate}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Updating...' : 'Update'}
      </button>
    </div>
  );
}

// ============================================
// Example 5: Access Requests
// ============================================
export function AccessRequestListExample() {
  const { data: requests, isLoading, error } = useAccessRequests();
  const createMutation = useCreateAccessRequest();

  const handleCreateRequest = async () => {
    try {
      await createMutation.mutateAsync({
        reqTo: 'manager@example.com',
        department: 'IT',
        isAgreed: true,
        itsrNo: 'ITSR-001',
        accessItems: [
          {
            folderPath: '\\\\server\\share',
            accessType: 'Read',
            confirmAccessType: 'Modify',
            reason: 'Project access'
          }
        ]
      });
      // Toast: "Request created successfully"
    } catch (error) {
      // Toast: "Failed to create request"
      console.error(error);
    }
  };

  if (isLoading) return <div>Loading requests...</div>;
  if (error) return <div>Error loading requests</div>;

  return (
    <div>
      <button onClick={handleCreateRequest} disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'New Request'}
      </button>
      
      <ul>
        {requests?.map(req => (
          <li key={req.accessReqId}>
            <strong>{req.ticketNumber}</strong> - {req.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// Example 6: Combined Loading States
// ============================================
export function ComplexComponentExample() {
  const employees = useEmployees();
  const requests = useAccessRequests();

  // Show loading only if both are loading
  const isLoading = employees.isLoading || requests.isLoading;
  const isError = employees.error || requests.error;

  if (isLoading) return <div>Loading all data...</div>;
  if (isError) return <div>Error loading data</div>;

  return (
    <div>
      <section>
        <h2>Employees ({employees.data?.length || 0})</h2>
        {/* Render employees */}
      </section>
      
      <section>
        <h2>Access Requests ({requests.data?.length || 0})</h2>
        {/* Render requests */}
      </section>
    </div>
  );
}

// ============================================
// Example 7: Delete with Confirmation
// ============================================
export function DeleteEmployeeExample({ employeeId }: { employeeId: number }) {
  const deleteMutation = useDeleteEmployee();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteMutation.mutateAsync(employeeId);
        // Toast: "Employee deleted"
        // Navigate away or refresh list
      } catch (error) {
        // Toast: "Failed to delete employee"
        console.error(error);
      }
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={deleteMutation.isPending}
      className="btn-danger"
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete Employee'}
    </button>
  );
}

// ============================================
// Example 8: Form Submission Pattern
// ============================================
export function EmployeeFormExample({ initialData }: { 
  initialData?: { displayName: string; department: string } 
}) {
  const [formData, setFormData] = useState(
    initialData || { displayName: '', department: '' }
  );

  const updateMutation = useUpdateEmployee();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate
      if (!formData.displayName.trim()) {
        alert('Display name is required');
        return;
      }

      // Submit
      await updateMutation.mutateAsync({
        id: 1, // Get from props or context
        request: {
          displayName: formData.displayName,
          department: formData.department
        }
      });

      // Reset form on success
      setFormData({ displayName: '', department: '' });

    } catch (error) {
      console.error('Form submission failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Display Name</label>
        <input
          type="text"
          value={formData.displayName}
          onChange={e => setFormData({ ...formData, displayName: e.target.value })}
          disabled={updateMutation.isPending}
        />
      </div>

      <div>
        <label>Department</label>
        <input
          type="text"
          value={formData.department}
          onChange={e => setFormData({ ...formData, department: e.target.value })}
          disabled={updateMutation.isPending}
        />
      </div>

      <button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving...' : 'Save'}
      </button>

      {updateMutation.error && (
        <div className="error">
          Error: {(updateMutation.error as Error).message}
        </div>
      )}
    </form>
  );
}
