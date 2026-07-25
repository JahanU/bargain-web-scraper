import { useState } from 'react';
import { XStack, YStack, Text, Button, AnimatePresence } from 'tamagui';
import Logo from '../../assets/hxh-logo.png';
import NewFeature from '../modal/NewFeatures';

function HeaderBar() {
  const [open, setOpen] = useState(false);

  return (
    <XStack
      backgroundColor="$background"
      paddingHorizontal="$4"
      paddingVertical="$3"
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
      width="100%"
      style={{ boxShadow: '0 1px 3px rgba(46,42,34,0.06)' }}
    >
      {/* Logo + wordmark */}
      <a
        href="https://github.com/JahanU/bargain-web-scraper"
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: 'none' }}
      >
        <XStack
          alignItems="center"
          gap="$2"
          cursor="pointer"
          hoverStyle={{ opacity: 0.85 }}
          pressStyle={{ opacity: 0.7 }}
        >
        <img
          src={Logo}
          alt="Bargain Scraper logo"
          style={{ height: 32, width: 32, objectFit: 'contain' }}
        />
        <YStack>
          <Text
            fontFamily="$heading"
            fontSize={18}
            fontWeight="700"
            color="$color11"
            letterSpacing={-0.3}
          >
            Bargain{' '}
            <Text color="$accentBackground" fontFamily="$heading" fontSize={18} fontWeight="700">
              Scraper
            </Text>
          </Text>
          <Text fontSize={11} color="$colorMuted" letterSpacing={0.2}>
            Live deals, curated daily
          </Text>
        </YStack>
        </XStack>
      </a>

      {/* Info button */}
      <Button
        size="$3"
        circular
        backgroundColor="transparent"
        hoverStyle={{
          backgroundColor: '$backgroundHover',
        }}
        pressStyle={{
          backgroundColor: '$backgroundPress',
          scale: 0.92,
        }}
        onPress={() => setOpen(true)}
        aria-label="What's new"
      >
        <Text fontSize={16} lineHeight={1} color="$color11">ℹ</Text>
      </Button>

      <AnimatePresence>
        {open && <NewFeature key="new-features" closeModal={setOpen} isOpen={open} />}
      </AnimatePresence>
    </XStack>
  );
}

export default HeaderBar;
