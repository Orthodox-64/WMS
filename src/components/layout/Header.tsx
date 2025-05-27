import { Box, Flex, IconButton, Text, Button, useColorModeValue, HStack, Badge } from '@chakra-ui/react';
import { FiMenu } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, role, signOut } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.800');

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'purple';
      case 'user':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <Box
      as="header"
      position="fixed"
      top="0"
      w="full"
      bg={bgColor}
      borderBottom="1px"
      borderColor="gray.200"
      zIndex="banner"
    >
      <Flex
        h="16"
        alignItems="center"
        justifyContent="space-between"
        px="4"
      >
        <HStack spacing={{ base: '2', md: '4' }} alignItems="center">
          <IconButton
            aria-label="Menu"
            icon={<FiMenu />}
            display={{ base: 'flex', md: 'none' }}
            onClick={onMenuClick}
            variant="ghost"
          />
          <Box mt="5">
            <Image
              src="/logo 3.jpeg"
              alt="AgroGreen Warehousing Logo"
              width={80}
              height={20}
              priority
            />
          </Box>
          <Text
            fontSize={{ base: 'md', md: 'xl' }}
            fontWeight="bold"
            display={{ base: 'none', md: 'block' }}
          >
            AgroGreen Warehousing
          </Text>
        </HStack>

        <Flex alignItems="center" gap="4">
          <HStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium" display={{ base: 'none', md: 'block' }}>
              {user?.email}
            </Text>
            <Badge
              colorScheme={getRoleColor(role)}
              px={2}
              py={1}
              borderRadius="md"
              textTransform="capitalize"
            >
              {role || 'No Role'}
            </Badge>
          </HStack>
          <Button
            size="sm"
            colorScheme="red"
            variant="ghost"
            onClick={() => signOut()}
          >
            Logout
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
} 