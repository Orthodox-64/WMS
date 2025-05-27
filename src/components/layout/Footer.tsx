import { Box, Text, useColorModeValue } from '@chakra-ui/react';

export default function Footer() {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      as="footer"
      position="fixed"
      bottom={0}
      w="full"
      bg={bgColor}
      borderTop="1px"
      borderColor={borderColor}
      py={4}
      textAlign="center"
    >
      <Text fontSize="sm" color="gray.500">
        © {new Date().getFullYear()} AgroGreen Warehousing. All rights reserved.
      </Text>
    </Box>
  );
} 