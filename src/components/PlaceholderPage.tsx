import { Box, Heading, Text } from '@chakra-ui/react';

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Box p={8}>
      <Heading mb={4}>{title}</Heading>
      <Text>This page is under construction. Coming soon!</Text>
    </Box>
  );
} 