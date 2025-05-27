'use client';

import { Box, Stat, StatLabel, StatNumber, StatHelpText, useColorModeValue } from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  helpText?: string;
}

export default function StatCard({ title, value, icon: Icon, helpText }: StatCardProps) {
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const iconBgColor = useColorModeValue('blue.100', 'blue.700');
  const iconColor = useColorModeValue('blue.600', 'blue.200');

  return (
    <Box
      p={{ base: 4, md: 6 }}
      bg={bgColor}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="md"
    >
      <Stat>
        <Box display="flex" alignItems="center" mb={3}>
          <Box
            p={3}
            bg={iconBgColor}
            borderRadius="full"
            color={iconColor}
            mr={4}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon size={24} />
          </Box>
          <StatLabel fontSize="sm" color="gray.600">{title}</StatLabel>
        </Box>
        <StatNumber fontSize={{ base: 'xl', md: '2xl' }} fontWeight="semibold">
          {value}
        </StatNumber>
        {helpText && (
          <StatHelpText mt={1} color="gray.500">
            {helpText}
          </StatHelpText>
        )}
      </Stat>
    </Box>
  );
} 