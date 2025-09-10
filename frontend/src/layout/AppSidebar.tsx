import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard as GridIcon,
  ChevronDownIcon,
  Briefcase as OrganizationIcon,
  Users as DepartmentIcon,
  FileText as LogIcon,
  Megaphone as MegaphoneIcon,
  BarChart3 as ReportIcon,
  FilePlus as FilePlusIcon,
  ClipboardEdit as ClipboardEditIcon,
  Building2 as BuildingIcon,
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
  roles: string[]; // Added roles to control visibility
};

const navItems: NavItem[] = [
  {
    name: "Master Admin Dashboard",
    icon: <GridIcon />,
    path: "/master-admin/dashboard",
    roles: ["MasterAdmin"],
  },
  {
    name: "Organization Mgmt",
    icon: <OrganizationIcon />,
    path: "/master-admin/organizations",
    roles: ["MasterAdmin"],
  },
  {
    name: "Dashboard",
    icon: <GridIcon />,
    path: "/organization-admin/dashboard",
    roles: ["OrganizationAdmin"],
  },
  {
    name: "Departments",
    icon: <BuildingIcon />,
    path: "/organization-admin/departments",
    roles: ["OrganizationAdmin"],
  },
  {
    name: "Department Admin Dashboard",
    icon: <GridIcon />,
    path: "/department-admin/dashboard",
    roles: ["DepartmentAdmin"],
  },
  {
    name: "Staff Management",
    icon: <DepartmentIcon />,
    path: "/department-admin/staff",
    roles: ["DepartmentAdmin"],
  },
  {
    name: "Announcements",
    icon: <MegaphoneIcon />,
    path: "/department-admin/announcements",
    roles: ["DepartmentAdmin"],
  },
  {
    name: "Staff Dashboard",
    icon: <GridIcon />,
    path: "/staff/dashboard",
    roles: ["Staff"],
  },
  {
    name: "Student Management",
    icon: <DepartmentIcon />,
    path: "/staff/student-management",
    roles: ["Staff"],
  },
  {
    name: "Student Logs",
    icon: <LogIcon />,
    path: "/staff/student-logs",
    roles: ["Staff"],
  },
  {
    name: "Reports",
    icon: <ReportIcon />,
    path: "/staff/reports",
    roles: ["Staff"],
  },
  {
    name: "Submit Activity",
    icon: <FilePlusIcon />,
    path: "/staff/submit-activity",
    roles: ["Staff"],
  },
  {
    name: "Manage Activities",
    icon: <ClipboardEditIcon />,
    path: "/staff/manage-activities",
    roles: ["Staff"],
  },
  {
    name: "Announcements",
    icon: <MegaphoneIcon />,
    path: "/staff/announcements",
    roles: ["Staff"],
  },
  {
    name: "Student Dashboard",
    icon: <GridIcon />,
    path: "/student/dashboard",
    roles: ["Student"],
  },
  {
    name: "Submit Activity",
    icon: <FilePlusIcon />,
    path: "/student/submit-activity",
    roles: ["Student"],
  },
  {
    name: "Manage Activities",
    icon: <ClipboardEditIcon />,
    path: "/student/manage-activities",
    roles: ["Student"],
  }
];

const AppSidebar: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const userRole = user?.role || "Student"; // Default to Student if no user

  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu(index);
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  // Organization profile (name) for sidebar
  const [orgName, setOrgName] = useState<string>("");
  const [orgLogoUrl, setOrgLogoUrl] = useState<string>("");
  useEffect(() => {
    const loadOrg = async () => {
      try {
        if (!user) return;
        const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const token = localStorage.getItem('elog_token') || '';
        let path: string | null = null;
        if (user.role === 'Staff') path = '/staff/me';
        else if (user.role === 'Student') path = '/student/me';
        else if (user.role === 'DepartmentAdmin') path = '/departments/me';
        else if (user.role === 'OrganizationAdmin') path = '/org/me';
        // fallback for other roles could be added here when backend supports
        if (!path) return;
        const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.organizationName) setOrgName(String(data.organizationName));
        else if (user.role === 'OrganizationAdmin' && data?.name) setOrgName(String(data.name));
        // Set organization logo if present
        if (user.role === 'OrganizationAdmin' && data?.avatarUrl) setOrgLogoUrl(String(data.avatarUrl));
        // For staff/students endpoints that include organizationAvatarUrl
        if (data?.organizationAvatarUrl) setOrgLogoUrl(String(data.organizationAvatarUrl));
      } catch {}
    };
    loadOrg();
  }, [user]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prevOpenSubmenu) => (prevOpenSubmenu === index ? null : index));
  };


  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items
        .filter((item) => item.roles.includes(userRole))
        .map((nav, index) => (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index)}
                className={`menu-item group ${
                  openSubmenu === index ? "menu-item-active" : "menu-item-inactive"
                } cursor-pointer ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <span
                  className={`menu-item-icon-size  ${
                    openSubmenu === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                      openSubmenu === index ? "rotate-180 text-brand-500" : ""
                    }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  className={`menu-item group ${
                    isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
              )
            )}
            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu === index
                      ? `${subMenuHeight[`${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {subItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
    </ul>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 bg-white dark:bg-gray-800 dark:border-r dark:border-gray-700 w-64 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-20 border-b dark:border-gray-700">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src={theme === 'dark' ? '/images/logo/logo-dark.svg' : '/images/logo/logo.svg'}
                alt="E-Log Book"
                className="h-8 w-auto"
              />
            </Link>
          </div>
          
          {user && (
            <div className="px-4 py-3 border-b dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <img
                  src={orgLogoUrl || (theme === 'dark' ? '/images/logo/logo-dark.svg' : '/images/logo/logo.svg')}
                  alt="Organization Logo"
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {orgName || 'Organization'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <nav className="h-full px-4 pb-4 mt-8">
            <div className="flex flex-col justify-between h-full">
              <div>
                <h3 className="menu-title dark:text-white">Menu</h3>
                {renderMenuItems(navItems)}
              </div>

              <div className="space-y-4">
                <SidebarWidget />
              </div>
            </div>
          </nav>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 left-0 z-30 h-screen transition-width duration-300 bg-white dark:bg-gray-800 dark:border-r dark:border-gray-700 ${
          isExpanded || isHovered ? 'lg:w-64' : 'lg:w-20'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-20 border-b dark:border-gray-700">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src={orgLogoUrl || (theme === 'dark' ? '/images/logo/logo-dark.svg' : '/images/logo/logo.svg')}
                alt="Organization Logo"
                className="h-8 w-auto rounded"
              />
            </Link>
          </div>

          {/* User Info */}
          {user && (isExpanded || isHovered) && (
            <div className="px-4 py-3 border-b dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <img
                  src={orgLogoUrl || (theme === 'dark' ? '/images/logo/logo-dark.svg' : '/images/logo/logo.svg')}
                  alt="Organization Logo"
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {orgName || 'Organization'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <nav className="h-full px-4 pb-4 mt-8">
            <div className="flex flex-col justify-between h-full">
              <div>
                <h3 className="menu-title dark:text-white">Menu</h3>
                {renderMenuItems(navItems)}
              </div>

              <div className="space-y-4">
                <SidebarWidget />
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
