import { Dialog, YStack, XStack, Text, Button, H2, Paragraph, AnimatePresence } from 'tamagui';

export default function NewFeature({
  closeModal,
  isOpen,
}: {
  closeModal: (arg0: boolean) => void;
  isOpen: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog key="new-features-dialog" open={isOpen} onOpenChange={() => closeModal(false)}>
          <Dialog.Portal>
            <Dialog.Overlay
              key="overlay"
              animation="medium"
              opacity={0.35}
              backgroundColor="$warmGray900"
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
            />
            <Dialog.Content
              key="content"
              animation="bouncy"
              enterStyle={{ opacity: 0, scale: 0.94, y: -8 }}
              exitStyle={{ opacity: 0, scale: 0.94, y: -8 }}
              opacity={1}
              scale={1}
              y={0}
              backgroundColor="$background"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$borderColor"
              padding="$5"
              maxWidth={420}
              width="92vw"
              shadowColor="rgba(46,42,34,0.15)"
              shadowRadius={24}
              shadowOffset={{ width: 0, height: 8 }}
            >
              {/* Header */}
              <XStack
                borderBottomWidth={1}
                borderBottomColor="$borderColor"
                paddingBottom="$3"
                marginBottom="$3"
                alignItems="flex-start"
                justifyContent="space-between"
                gap="$3"
              >
                <YStack gap="$0_5" flex={1}>
                  <XStack alignItems="center" gap="$2">
                    <Text fontSize={20}>🚀</Text>
                    <H2
                      fontSize={18}
                      fontWeight="700"
                      color="$color11"
                      fontFamily="$heading"
                    >
                      What's coming
                    </H2>
                  </XStack>
                  <Text fontSize={12} color="$colorMuted">
                    Upcoming features & improvements
                  </Text>
                </YStack>
                <Dialog.Close asChild>
                  <Button
                    size="$2"
                    circular
                    backgroundColor="transparent"
                    color="$colorMuted"
                    hoverStyle={{ backgroundColor: '$backgroundHover' }}
                    pressStyle={{ scale: 0.9 }}
                    animation="quick"
                    onPress={() => closeModal(false)}
                    aria-label="Close"
                  >
                    ✕
                  </Button>
                </Dialog.Close>
              </XStack>

              {/* Feature list */}
              <YStack gap="$2">
                {[
                  { icon: '📚', text: 'Full filtering by type, brand, size & gender with sorting options' },
                  { icon: '🔍', text: 'Search by name, brand, type, colour, size and more' },
                  { icon: '🕊', text: 'Enhancements to the Telegram Bot — check it out: t.me/JD_sales_bot' },
                  { icon: '👕', text: 'ASOS is next to be scraped!' },
                ].map(({ icon, text }) => (
                  <XStack
                    key={text}
                    gap="$2"
                    alignItems="flex-start"
                    padding="$2"
                    backgroundColor="$backgroundStrong"
                    borderRadius="$2"
                  >
                    <Text fontSize={16} flexShrink={0}>{icon}</Text>
                    <Paragraph fontSize={13} color="$color11" lineHeight={18} flex={1}>
                      {text}
                    </Paragraph>
                  </XStack>
                ))}
              </YStack>

              {/* Footer */}
              <XStack justifyContent="flex-end" marginTop="$4">
                <Button
                  size="$3"
                  backgroundColor="$accentBackground"
                  borderRadius="$2"
                  color="$background"
                  fontWeight="600"
                  paddingHorizontal="$5"
                  hoverStyle={{ backgroundColor: '$cactusDark' as any }}
                  pressStyle={{ scale: 0.97 }}
                  animation="quick"
                  onPress={() => closeModal(false)}
                >
                  Got it
                </Button>
              </XStack>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
