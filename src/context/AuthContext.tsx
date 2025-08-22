import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'MasterAdmin' | 'OrganizationAdmin' | 'DepartmentAdmin' | 'Staff' | 'Student';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean; // Add loading state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy users for different roles
const dummyUsers: Record<UserRole, User> = {
  MasterAdmin: {
    id: '1',
    name: 'Master Administrator',
    email: 'master@elog.com',
    role: 'MasterAdmin',
  },
  OrganizationAdmin: {
    id: '2',
    name: 'Organization Admin',
    email: 'org-admin@elog.com',
    role: 'OrganizationAdmin',
  },
  DepartmentAdmin: {
    id: '3',
    name: 'Department Admin',
    email: 'dept-admin@elog.com',
    role: 'DepartmentAdmin',
  },
  Staff: {
    id: '4',
    name: 'Staff Member',
    email: 'staff@elog.com',
    role: 'Staff',
  },
  Student: {
    id: '5',
    name: 'Student',
    email: 'user@elog.com',
    role: 'Student',
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Initialize loading to true

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple dummy authentication - any password works
    if (email && password) {
      const selectedUser = dummyUsers[role];
      setUser(selectedUser);
      localStorage.setItem('elog_user', JSON.stringify(selectedUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('elog_user');
  };

  // Check for existing user on mount
  React.useEffect(() => {
    const savedUser = localStorage.getItem('elog_user');
    try {
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      localStorage.removeItem('elog_user');
    } finally {
      setLoading(false); // Set loading to false after checking
    }
  }, []);

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
