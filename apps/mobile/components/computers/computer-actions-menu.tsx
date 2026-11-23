import { useLingui } from "@lingui/react/macro";
import type { ComputerStatus } from "@rakazo/contracts";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { rpc } from "../../lib/api/api";
import { errorText } from "../../lib/api/user-error";
import { computerUpdates } from "../../lib/computers/computer-updates";
import { useMobileTokens } from "../../lib/native/native";
import { NativeMenu } from "../native/native-menu";
import { NativeSymbol } from "../native/native-symbol";

type Action = "stop" | "recover" | "reset" | "update";

/**
 * The maintenance menu that sits under the Team/Private picker: stop, recover, reset and
 * update. The server offers each only when the computer can take it, and the screen stays
 * usable while one runs.
 */
export function ComputerActionsMenu({
  botId,
  computer,
  onChanged,
}: {
  botId: string;
  computer: ComputerStatus | null;
  onChanged: () => Promise<void>;
}) {
  const { t } = useLingui();
  const tokens = useMobileTokens();
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = Boolean(computer?.busyBotName) || computer?.state === "booting" || pending !== null;

  async function run(action: Action) {
    if (busy) return;
    setPending(action);
    setError(null);
    try {
      if (action === "stop") await rpc("computer/stop", { botId });
      else if (action === "reset") await rpc("computer/reset", { botId });
      else await computerUpdates.start(botId, action);
      await onChanged();
    } catch (err) {
      setError(
        errorText(
          err,
          action === "stop" ? t`Could not stop computer` : t`Could not update computer`,
        ),
      );
    } finally {
      setPending(null);
    }
  }

  function confirm(action: "recover" | "reset") {
    Alert.alert(
      action === "reset" ? t`Reset computer?` : t`Recover computer?`,
      action === "reset"
        ? t`Restore the last saved workspace. Unsaved work on the computer is lost.`
        : t`Recovery restores the last saved workspace. Unsaved work may be lost.`,
      [
        { text: t`Cancel`, style: "cancel" },
        {
          text: action === "reset" ? t`Reset` : t`Recover computer`,
          style: "destructive",
          onPress: () => void run(action),
        },
      ],
    );
  }

  const actions: {
    id: Action;
    title: string;
    description?: string;
    attributes?: { destructive?: boolean; disabled?: boolean };
  }[] = [
    ...(computer?.state === "running"
      ? [{ id: "stop" as Action, title: t`Stop computer` }]
      : []),
    // Recover rebuilds the computer's system, which only computers that can update have.
    ...(computer?.canUpdate
      ? [
          {
            id: "recover" as Action,
            title: t`Recover computer`,
            description: t`Recreate a computer that is not working.`,
          },
        ]
      : []),
    {
      id: "reset" as Action,
      title: t`Reset computer`,
      description: t`Restore the last saved workspace.`,
      attributes: { destructive: true },
    },
    ...(computer?.canUpdate
      ? [
          {
            id: "update" as Action,
            title: t`Update computer`,
            description: t`Save the workspace and install current software.`,
          },
        ]
      : []),
  ].map((action) =>
    busy ? { ...action, attributes: { ...action.attributes, disabled: true } } : action,
  ) as typeof actions;

  if (!computer || actions.length === 0) return null;

  return (
    <View>
      <NativeMenu
        title={t`More computer actions`}
        actions={actions}
        onPressAction={(id) => {
          const action = id as Action;
          if (action === "reset" || action === "recover") confirm(action);
          else void run(action);
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            marginTop: 12,
            minHeight: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: tokens.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Text style={{ color: tokens.foreground, fontSize: 15.5, fontWeight: "500" }}>
            {pending ? t`Working…` : t`More computer actions`}
          </Text>
          <NativeSymbol
            ios="chevron.down"
            android="chevron-down"
            color={tokens.mutedForeground}
            size={14}
          />
        </View>
      </NativeMenu>
      {error ? (
        <Text style={{ marginTop: 8, color: tokens.destructive, fontSize: 13 }}>{error}</Text>
      ) : null}
    </View>
  );
}
