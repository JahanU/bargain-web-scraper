import { YStack, Text, H2, Button } from 'tamagui';

const ErrorState = () => {
  return (
    <YStack
      flex={1}
      paddingVertical="$16"
      alignItems="center"
      justifyContent="center"
      gap="$3"
    >
      <Text fontSize={36} textAlign="center">⚠️</Text>
      <H2 fontSize={20} fontWeight="700" color="$color11" fontFamily="$heading" textAlign="center">
        Server unavailable
      </H2>
      <Text fontSize={13} color="$colorMuted" textAlign="center" maxWidth={280}>
        We couldn't reach the deals server. Please check back in a moment.
      </Text>
      <Button
        marginTop="$2"
        size="$3"
        backgroundColor="$accentBackground"
        borderRadius="$2"
        color="$background"
        fontWeight="600"
        hoverStyle={{ backgroundColor: '$cactusDark' as any }}
        pressStyle={{ scale: 0.97 }}
        animation="quick"
        onPress={() => window.location.reload()}
      >
        Try again
      </Button>
    </YStack>
  );
};

export default ErrorState;