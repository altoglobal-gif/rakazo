import type { MenuAction } from "@expo/ui/community/menu";
import { MenuView } from "@expo/ui/community/menu";
import type { ReactNode } from "react";
import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { mobileTokens } from "../lib/appearance";
import { useI18n } from "../lib/i18n";
import { useThemedStyles } from "../lib/native";

/** A menu item with an optional explanation line under its title, like the web dropdowns. */
export type NativeMenuItem = MenuAction & { description?: string };

/** The native menu. iOS keeps the SwiftUI dropdown; Android opens a plain bottom sheet,
 * because @expo/ui's Compose menu does not open in every production binary (a running
 * APK can lack its native views, leaving a trigger that taps into nothing). */
export function NativeMenu({
  title,
  actions,
  onPressAction,
  shouldOpenOnLongPress = false,
  accessibilityLabel = title,
  style,
  children,
}: {
  title: string;
  actions: NativeMenuItem[];
  onPressAction: (id: string) => void;
  shouldOpenOnLongPress?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (Platform.OS !== "android") {
    return (
      <MenuView
        shouldOpenOnLongPress={shouldOpenOnLongPress}
        title={title}
        actions={actions.map((action) =>
          action.description
            ? {
                id: action.id,
                title: action.description,
                displayInline: true,
                subactions: [
                  {
                    id: action.id,
                    title: action.title,
                    attributes: action.attributes,
                    state: action.state,
                  },
                ],
              }
            : action,
        )}
        onPressAction={({ nativeEvent }) => onPressAction(nativeEvent.event)}
        style={style}
      >
        {children}
      </MenuView>
    );
  }
  return (
    <AndroidMenuSheet
      title={title}
      actions={actions}
      onPressAction={onPressAction}
      shouldOpenOnLongPress={shouldOpenOnLongPress}
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      {children}
    </AndroidMenuSheet>
  );
}

/** One row of the sheet. */
function MenuRow({ action, onPress }: { action: NativeMenuItem; onPress: (id: string) => void }) {
  const styles = useThemedStyles(createStyles);
  const disabled = Boolean(action.attributes?.disabled);
  const destructive = Boolean(action.attributes?.destructive);
  const body = (
    <View style={styles.itemCopy}>
      <View style={styles.itemLine}>
        <Text style={[styles.itemTitle, destructive && styles.destructive]} numberOfLines={1}>
          {action.title}
        </Text>
        {action.state === "on" ? <Text style={styles.check}>✓</Text> : null}
      </View>
      {action.description ? (
        <Text style={styles.itemDescription} numberOfLines={2}>
          {action.description}
        </Text>
      ) : null}
    </View>
  );
  if (disabled) {
    return (
      <View style={styles.item} accessibilityState={{ disabled: true }}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="menuitem"
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      onPress={() => onPress(action.id ?? action.title)}
    >
      {body}
    </Pressable>
  );
}

function AndroidMenuSheet({
  title,
  actions,
  onPressAction,
  shouldOpenOnLongPress,
  accessibilityLabel,
  style,
  children,
}: {
  title: string;
  actions: NativeMenuItem[];
  onPressAction: (id: string) => void;
  shouldOpenOnLongPress: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);

  function press(id: string) {
    setOpen(false);
    if (id) onPressAction(id);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onLongPress={shouldOpenOnLongPress ? () => setOpen(true) : undefined}
        onPress={shouldOpenOnLongPress ? undefined : () => setOpen(true)}
        style={style}
      >
        {children}
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} accessible={false} />
          <Text accessibilityRole="header" style={styles.sheetTitle} numberOfLines={1}>
            {title}
          </Text>
          {actions.map((action) => {
            if (action.attributes?.hidden) return null;
            const subactions = action.subactions ?? [];
            return (
              <View key={action.id ?? action.title}>
                <MenuRow action={action} onPress={press} />
                {subactions.length
                  ? subactions.map((sub) => (
                      <View key={sub.id ?? sub.title} style={styles.subaction}>
                        <MenuRow action={sub} onPress={press} />
                      </View>
                    ))
                  : null}
              </View>
            );
          })}
          <Pressable
            accessibilityRole="button"
            style={styles.cancel}
            onPress={() => setOpen(false)}
          >
            <Text style={styles.cancelText}>{t("Cancel")}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

function createStyles() {
  const tokens = mobileTokens();
  return StyleSheet.create({
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: tokens.overlay,
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: tokens.card,
      paddingBottom: 24,
      paddingHorizontal: 8,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      marginTop: 8,
      backgroundColor: tokens.muted,
    },
    sheetTitle: {
      color: tokens.mutedForeground,
      fontSize: 13,
      fontWeight: "600",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    item: {
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 10,
    },
    itemCopy: { gap: 2 },
    itemLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    itemTitle: { flex: 1, color: tokens.foreground, fontSize: 16 },
    itemDescription: { color: tokens.mutedForeground, fontSize: 13 },
    destructive: { color: tokens.destructive },
    pressed: { backgroundColor: tokens.muted },
    check: { color: tokens.primary, fontSize: 16, fontWeight: "600" },
    subaction: { marginStart: 16 },
    cancel: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      marginTop: 4,
    },
    cancelText: { color: tokens.mutedForeground, fontSize: 16, fontWeight: "600" },
  });
}
