--- 
title: "How Instagram, WhatsApp, Uber & Netflix Would Be Built Today Using Expo Router"
description: "Exploring production-grade React Native architecture with Expo Router, feature-based folders, and offline-first state management."
pubDate: "2026-05-31"
tags:
  - react-native
  - expo
  - architecture
  - mobile
coverImage: "../../../assets/thumbnails/how-instagram-whatsapp-uber-netflix-built-with-expo-router.svg"
---

Building apps like Instagram, WhatsApp, Uber, and Netflix is not about copying their UI. It is about designing systems that scale to millions of users without becoming impossible to maintain. In this article, we will explore how modern large-scale mobile apps are structured using Expo Router and production-grade React Native architecture.

## Why Simple Folder Structures Fail

A typical beginner structure looks like this:

```
/screens
  HomeScreen.tsx
  ProfileScreen.tsx
/components
  Button.tsx
  Card.tsx
/utils
  api.ts
```

This works for small apps. But at scale, it creates serious problems [web:2]:

- Business logic is scattered across unrelated files
- Navigation becomes tightly coupled to UI
- Features cannot be developed in isolation
- Refactoring becomes risky because one change affects many unrelated areas

When your team grows beyond two developers, this structure slows everyone down.

## Production-Grade Folder Structure

Expo Router uses file-based routing. Your folder structure becomes your navigation map [web:1]. Here is how a production app should be organized:

```
src/
├── app/                          # Expo Router file-based routes
│   ├── (auth)/                   # Public route group
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (app)/                    # Protected route group
│   │   ├── _layout.tsx
│   │   ├── (tabs)/               # Bottom tabs
│   │   │   ├── _layout.tsx
│   │   │   ├── feed/
│   │   │   │   └── index.tsx
│   │   │   ├── explore/
│   │   │   │   └── index.tsx
│   │   │   └── profile/
│   │   │       └── index.tsx
│   │   ├── messages/
│   │   │   ├── _layout.tsx
│   │   │   └── [id].tsx
│   │   └── settings.tsx
│   └── _layout.tsx               # Root layout with providers
├── features/                     # Feature-based modules
│   ├── auth/
│   ├── feed/
│   ├── chat/
│   ├── ride/
│   └── video/
├── lib/                          # Global utilities
├── providers/                    # Context providers
└── config/                       # App configuration
```

This structure separates routes from business logic. The `app/` folder only handles navigation. The `features/` folder contains everything each feature needs.

## Feature-Based Architecture

Each feature is self-contained. A feature owns its own components, hooks, state, and API logic:

```
features/feed/
├── api/
│   ├── fetchFeed.ts
│   └── likePost.ts
├── components/
│   ├── FeedCard.tsx
│   └── FeedList.tsx
├── hooks/
│   ├── useFeed.ts
│   └── useLikePost.ts
├── stores/
│   └── feedStore.ts
├── types/
│   └── feed.types.ts
└── index.ts                      # Public API of the feature
```

This isolation means a developer can work on the feed feature without touching chat or ride features. It also makes testing and code splitting easier.

## Authentication Flow with Protected Routes

Expo Router v4 and v5 introduce `Stack.Protected` for route guarding [web:16][web:25]. Here is a production-ready auth setup:

**Root layout (`app/_layout.tsx`):**

```tsx
import { Stack } from 'expo-router';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
```

**Auth store (`features/auth/stores/authStore.ts`):**

```tsx
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,

  login: async (token) => {
    await SecureStore.setItemAsync('token', token);
    set({ token, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    set({ token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },
}));
```

The `restoreSession` call happens in a splash screen or root layout effect before rendering the navigation stack.

## State Management Strategy

Large apps need clear separation between server state and client state:

| State Type | Tool | Purpose |
|------------|------|---------|
| Server state | TanStack Query | API caching, background sync, deduplication |
| Global client state | Zustand | Auth, theme, user preferences |
| Local UI state | useState | Form inputs, modals, animations |

**Feed hook using TanStack Query (`features/feed/hooks/useFeed.ts`):**

```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchFeed } from '../api/fetchFeed';

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: fetchFeed,
    staleTime: 1000 * 60 * 2, // 2 minutes
    networkMode: 'offlineFirst',
  });
}
```

**Zustand store for global UI (`features/feed/stores/feedStore.ts`):**

```tsx
import { create } from 'zustand';

interface FeedStore {
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),
}));
```

## API Layer Design

Never call fetch directly inside components. Create a dedicated API layer:

```ts
// lib/api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);
```

```ts
// features/feed/api/fetchFeed.ts
import { apiClient } from '@/lib/api/client';

export async function fetchFeed() {
  const { data } = await apiClient.get('/feed');
  return data;
}
```

This gives you centralized error handling, request logging, and easy test mocking.

## Realtime Systems Architecture

### Chat (WhatsApp-style)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │◄───►│  WebSocket  │◄───►│   Server    │
│             │     │   Manager   │     │             │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│ Local Queue │
│ (SQLite)    │
└─────────────┘
```

Flow:
1. User sends message → optimistic UI update
2. Message enters local queue
3. WebSocket sends to server
4. Server confirms → mark as sent
5. Offline? Queue persists and retries automatically

```tsx
// features/chat/hooks/useSendMessage.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../api/sendMessage';

export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onMutate: async (newMessage) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['chat', chatId] });
      const previous = queryClient.getQueryData(['chat', chatId]);
      queryClient.setQueryData(['chat', chatId], (old) => [...old, newMessage]);
      return { previous };
    },
    onError: (err, newMessage, context) => {
      queryClient.setQueryData(['chat', chatId], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
    },
  });
}
```

### Live Location (Uber-style)

For ride tracking, throttle location updates to every 2-3 seconds to preserve battery and reduce server load:

```tsx
import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export function useLiveLocation(onUpdate: (loc: Location.LocationObject) => void) {
  const throttleRef = useRef<number>(0);

  useEffect(() => {
    const sub = Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 3000 },
      (location) => {
        const now = Date.now();
        if (now - throttleRef.current > 3000) {
          throttleRef.current = now;
          onUpdate(location);
        }
      }
    );
    return () => sub.then((s) => s.remove());
  }, [onUpdate]);
}
```

## Offline-First Support and Caching

Modern apps must work without perfect connectivity.

```tsx
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      networkMode: 'offlineFirst',
      retry: 2,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

// In your root layout:
// <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
```

With `offlineFirst`, TanStack Query serves cached data immediately and refreshes in the background when online.

## App Startup Optimization

Startup flow for a production app:

```
Splash Screen
     │
     ▼
Restore Auth Session (SecureStore)
     │
     ▼
Initialize QueryClient + Hydrate Cache
     │
     ▼
Load Minimal UI (skeleton screens)
     │
     ▼
Fetch Critical Data in Background
     │
     ▼
Hide Splash Screen
```

Code in `app/_layout.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { SplashScreen } from 'expo-router';
import { useAuthStore } from '@/features/auth/stores/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    async function init() {
      await restoreSession();
      // Preload fonts, cache, etc.
      setReady(true);
      SplashScreen.hideAsync();
    }
    init();
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>...</Stack>
    </QueryClientProvider>
  );
}
```

## Navigation Hierarchy for Large Apps

```
Root Stack (Protected)
├── (auth) Stack
│   ├── login
│   └── register
│
└── (app) Stack
    ├── (tabs) Tab Navigator
    │   ├── feed
    │   ├── explore
    │   └── profile
    │
    ├── messages Stack
    │   └── [id] (dynamic route)
    │
    └── settings Modal
```

Expo Router handles this through file nesting and layout files. Shared layouts (`_layout.tsx`) define UI wrappers like headers, tab bars, or safe areas.

## Scalability Challenges by App

### Instagram → Feeds and Media

Challenges:
- Infinite scrolling with thousands of items
- Image/video caching and preloading
- High engagement with real-time notifications

Architecture focus:
- Use `FlatList` with `windowSize={5}` and `getItemLayout` for smooth scrolling
- Integrate a native image cache like `react-native-fast-image`
- Background prefetch next page during scroll

### WhatsApp → Realtime Messaging

Challenges:
- Message ordering and delivery guarantees
- Offline message queue
- End-to-end encryption (client-side)

Architecture focus:
- WebSocket for realtime, SQLite for persistence
- Optimistic updates with rollback on failure
- Sync protocol: client sends `lastMessageId`, server sends delta

### Uber → Maps and Live Location

Challenges:
- Real-time location streaming
- Map rendering performance
- Matching engine communication

Architecture focus:
- Throttle GPS updates (every 3 seconds)
- Use map clustering for many markers
- Separate location stream from UI updates to prevent re-renders

### Netflix → Heavy Content Delivery

Challenges:
- Large video assets
- Device capability variety
- Personalized recommendations

Architecture focus:
- Lazy load routes with `React.lazy` or dynamic imports
- Prefetch metadata, not video
- Use CDN URLs with adaptive bitrate (handled by native video players)

## Tradeoffs and Architectural Decisions

Teams at scale constantly balance these tradeoffs:

| Decision | Tradeoff |
|----------|----------|
| Feature-based folders | More setup upfront, but easier to scale |
| TanStack Query | Powerful caching, but adds bundle size |
| Zustand vs Redux | Zustand is lighter; Redux has more dev tools |
| Offline-first | Better UX, but complex sync logic |
| File-based routing | Less flexible than code-based, but self-documenting |

There is no single right answer. The best architecture is the one your team can maintain consistently.

## Final Thoughts

Expo Router gives you a strong foundation for scalable navigation and clear folder structure [web:1]. But the real difference comes from:

- Thinking in features, not file types
- Separating server state from client state
- Designing for offline from day one
- Keeping startup fast and rendering lazy

If you structure your app well from the beginning, scaling becomes evolution instead of chaos.
