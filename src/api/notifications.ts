import { gql } from "./graphql";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  deepLink: string;
  createdAt: string;
  read: boolean;
}

export const notificationsApi = {
  list: () =>
    gql<{ notifications: AppNotification[] }>(
      "Notifications",
      `query Notifications { notifications { id kind title body deepLink createdAt read } }`,
    ).then((d) => d.notifications),
  markRead: (id: string) =>
    gql<{ markNotificationRead: { id: string } | null }>(
      "MarkNotificationRead",
      `mutation MarkNotificationRead($id: ID!) { markNotificationRead(id: $id) { id } }`,
      { id },
    ),
};
