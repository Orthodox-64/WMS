'use client';

import { Box, SimpleGrid, Heading } from '@chakra-ui/react';
import { FiHome, FiInbox, FiFileText, FiPackage } from 'react-icons/fi';
import StatCard from '@/components/dashboard/StatCard';
import WarehouseChart from '@/components/charts/WarehouseChart';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Box>
        <Heading mb={6}>Dashboard</Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <StatCard
            title="Total Warehouses"
            value="12"
            icon={FiHome}
            helpText="Active warehouses"
          />
          <StatCard
            title="Pending Inward"
            value="45"
            icon={FiInbox}
            helpText="Items to be received"
          />
          <StatCard
            title="Pending RO"
            value="23"
            icon={FiFileText}
            helpText="Release orders pending"
          />
          <StatCard
            title="Pending Outward"
            value="34"
            icon={FiPackage}
            helpText="Items to be dispatched"
          />
        </SimpleGrid>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <WarehouseChart />
        </Box>
      </Box>
    </DashboardLayout>
  );
} 