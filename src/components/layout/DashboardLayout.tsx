"use client"
import { ReactNode } from 'react';
import { Box, Flex, useDisclosure } from '@chakra-ui/react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Header onMenuClick={onOpen} />
      <Flex>
        <Sidebar isOpen={isOpen} onClose={onClose} />
        <Box
          flex="1"
          p="4"
          ml={{ base: 0, md: 60 }}
          transition=".3s ease"
          pb="20"
        >
          {children}
        </Box>
      </Flex>
      <Footer />
    </Box>
  );
} 