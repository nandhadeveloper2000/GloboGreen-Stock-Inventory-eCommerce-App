import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { ROLES, type UserRole } from "../../constants/roles";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

type TabIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type TabItem = {
  name: string;
  title: string;
  icon: TabIconName;
  roles: UserRole[];
};

const ALL_TABS: TabItem[] = [
  {
    name: "dashboard",
    title: "Dashboard",
    icon: "view-dashboard-outline",
    roles: [
      ROLES.MASTER_ADMIN,
      ROLES.MANAGER,
      ROLES.SUPERVISOR,
      ROLES.STAFF,
    ],
  },
  {
    name: "shopOwners",
    title: "Shop Owners",
    icon: "store-outline",
    roles: [ROLES.MASTER_ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
  },
  {
    name: "Manager",
    title: "Managers",
    icon: "account-group-outline",
    roles: [ROLES.MASTER_ADMIN],
  },
  {
    name: "staffs",
    title: "Staff",
    icon: "account-tie-outline",
    roles: [ROLES.MASTER_ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
  },
  {
    name: "MySettings",
    title: "My Settings",
    icon: "account-circle-outline",
    roles: [
      ROLES.MASTER_ADMIN,
      ROLES.MANAGER,
      ROLES.SUPERVISOR,
      ROLES.STAFF,
    ],
  },
];

type PremiumTabButtonProps = {
  routeKey: string;
  label: string;
  focused: boolean;
  width: number;
  icon: React.ReactNode;
  compact: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

function getFocusedIcon(icon: TabIconName): TabIconName {
  const focusedMap: Partial<Record<TabIconName, TabIconName>> = {
    "view-dashboard-outline": "view-dashboard",
    "store-outline": "store",
    "account-group-outline": "account-group",
    "account-tie-outline": "account-tie",
    "account-circle-outline": "account-circle",
  };

  return focusedMap[icon] || icon;
}

function PremiumTabButton({
  routeKey,
  label,
  focused,
  width,
  icon,
  compact,
  onPress,
  onLongPress,
}: PremiumTabButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const iconTranslateY = useRef(new Animated.Value(focused ? -1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(labelOpacity, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(iconTranslateY, {
        toValue: focused ? -1 : 0,
        useNativeDriver: true,
        friction: 7,
        tension: 120,
      }),
    ]).start();
  }, [focused, labelOpacity, iconTranslateY]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 7,
      tension: 160,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 160,
    }).start();
  };

  return (
    <Pressable
      key={routeKey}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tabButton, { width }]}
      android_ripple={{ color: "rgba(22,187,5,0.08)", borderless: false }}
    >
      <Animated.View
        style={[
          styles.tabInner,
          compact ? styles.tabInnerCompact : styles.tabInnerRegular,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconWrap,
            {
              transform: [{ translateY: iconTranslateY }],
            },
          ]}
        >
          {icon}
        </Animated.View>

        <Animated.View
          style={{
            opacity: labelOpacity,
            maxWidth: width - 8,
            marginTop: compact ? 2 : 3,
          }}
        >
          {focused ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.tabLabel,
                compact ? styles.tabLabelCompact : styles.tabLabelRegular,
              ]}
            >
              {label}
            </Text>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const tabCount = Math.max(state.routes.length, 1);
  const isSmallPhone = screenWidth < 380;
  const isTablet = screenWidth >= 768;
  const compact = isSmallPhone || tabCount >= 5;

  const horizontalMargin = isTablet ? 28 : 12;
  const containerWidth = Math.min(screenWidth - horizontalMargin * 2, 720);

  const containerPadding = compact ? 5 : 6;
  const pillGap = compact ? 5 : 6;
  const tabWidth = containerWidth / tabCount;
  const activePillWidth = Math.max(tabWidth - pillGap * 2, 54);

  const bottomOffset =
    Platform.OS === "ios"
      ? Math.max(insets.bottom, 10)
      : Math.max(insets.bottom, 8);

  const translateX = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 95,
    }).start();
  }, [state.index, tabWidth, translateX]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabBarOuter,
        {
          bottom: bottomOffset,
          paddingHorizontal: horizontalMargin,
        },
      ]}
    >
      <View
        style={[
          styles.tabBarContainer,
          compact ? styles.tabBarContainerCompact : styles.tabBarContainerRegular,
          {
            width: containerWidth,
            padding: containerPadding,
            borderRadius: compact ? 22 : 24,
            minHeight: compact ? 62 : 68,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.activePill,
            {
              width: activePillWidth,
              top: pillGap,
              bottom: pillGap,
              left: 0,
              borderRadius: compact ? 16 : 18,
              transform: [
                {
                  translateX: Animated.add(
                    translateX,
                    new Animated.Value(pillGap)
                  ),
                },
              ],
            },
          ]}
        />

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];

          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
              ? options.title
              : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const icon =
            typeof options.tabBarIcon === "function"
              ? options.tabBarIcon({
                  focused,
                  color: focused ? COLORS.primaryDark : COLORS.slate,
                  size: compact ? 20 : 21,
                })
              : null;

          return (
            <PremiumTabButton
              key={route.key}
              routeKey={route.key}
              label={label}
              focused={focused}
              width={tabWidth}
              icon={icon}
              compact={compact}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function MyLayout() {
  const auth = useAuth();
  const currentRole = normalizeRole(auth?.user?.role ?? null);

  const visibleTabs = useMemo(() => {
    if (!currentRole) return [];
    return ALL_TABS.filter((tab) => tab.roles.includes(currentRole));
  }, [currentRole]);

  const { width } = useWindowDimensions();
  const isSmallPhone = width < 380;

  return (
    <Tabs
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTintColor: COLORS.heading,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: isSmallPhone ? 17 : 18,
        },
        tabBarStyle: {
          display: "none",
        },
        sceneStyle: {
          backgroundColor: COLORS.pageBg,
          paddingBottom: Platform.OS === "ios" ? 100 : 92,
        },
      }}
    >
      {visibleTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerTitle: tab.title,
            tabBarLabel: tab.title,
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons
                name={focused ? getFocusedIcon(tab.icon) : tab.icon}
                color={color}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },

  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: "hidden",
  },

  tabBarContainerRegular: {},

  tabBarContainerCompact: {
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  activePill: {
    position: "absolute",
    backgroundColor: "#E8FBE5",
    borderWidth: 1,
    borderColor: "rgba(22,187,5,0.10)",
  },

  tabButton: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },

  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },

  tabInnerRegular: {
    minHeight: 56,
    paddingVertical: 6,
  },

  tabInnerCompact: {
    minHeight: 52,
    paddingVertical: 5,
  },

  iconWrap: {
    minWidth: 26,
    minHeight: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  tabLabel: {
    color: COLORS.primaryDark,
    fontWeight: "800",
    textAlign: "center",
  },

  tabLabelRegular: {
    fontSize: 10,
  },

  tabLabelCompact: {
    fontSize: 9,
  },
});