import {
  Box,
  VStack,
  Icon,
  Text,
  Link,
  useColorModeValue,
  Drawer,
  DrawerContent,
  useDisclosure,
} from '@chakra-ui/react';
import { FiHome } from 'react-icons/fi';
import { FiClipboard } from 'react-icons/fi';
import { FiInbox } from 'react-icons/fi';
import { FiPackage } from 'react-icons/fi';
import { FiBarChart2 } from 'react-icons/fi';
import { FiFileText } from 'react-icons/fi';
import { FiDatabase } from 'react-icons/fi';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/roles';

interface NavItemProps {
  icon: any;
  children: string;
  href: string;
  isActive: boolean;
}

const NavItem = ({ icon, children, href, isActive }: NavItemProps) => {
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.600', 'blue.200');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');

  return (
    <Link
      as={NextLink}
      href={href}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
    >
      <Box
        display="flex"
        alignItems="center"
        p="3"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={isActive ? activeBg : 'transparent'}
        color={isActive ? activeColor : 'inherit'}
        _hover={{
          bg: hoverBg,
        }}
      >
        <Icon
          mr="4"
          fontSize="16"
          as={icon}
        />
        <Text fontSize="sm" fontWeight="medium">
          {children}
        </Text>
      </Box>
    </Link>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const allNavItems = [
    { icon: FiHome, label: 'Dashboard', href: '/dashboard' },
    { icon: FiClipboard, label: 'UH Surveys', href: '/surveys' },
    { icon: FiInbox, label: 'Inward', href: '/inward' },
    { icon: FiPackage, label: 'Outward', href: '/outward' },
    { icon: FiBarChart2, label: 'Reports', href: '/reports' },
    { icon: FiFileText, label: 'Release Order', href: '/ro' },
    { icon: FiDatabase, label: 'Master Data', href: '/master-data' },
  ];

  const navItems = allNavItems.filter(item => hasPermission(role, item.href));

  const SidebarContent = (
    <Box
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      pt="20"
    >
      <VStack spacing={1} align="stretch">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            href={item.href}
            isActive={pathname === item.href}
          >
            {item.label}
          </NavItem>
        ))}
      </VStack>
    </Box>
  );

  return (
    <>
      <Box
        display={{ base: 'none', md: 'block' }}
        w="60"
      >
        {SidebarContent}
      </Box>
      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="full"
      >
        <DrawerContent>
          {SidebarContent}
        </DrawerContent>
      </Drawer>
    </>
  );
} 