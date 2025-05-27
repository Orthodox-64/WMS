'use client';

import { Box, useColorModeValue } from '@chakra-ui/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Wheat', value: 400 },
  { name: 'Rice', value: 300 },
  { name: 'Corn', value: 300 },
  { name: 'Soybeans', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function WarehouseChart() {
  return (
    <Box
      p={5}
      shadow="xl"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.600')}
      rounded="lg"
      bg={useColorModeValue('white', 'gray.700')}
    >
      <Box h="400px">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={150}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
} 