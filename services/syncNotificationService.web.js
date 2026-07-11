// Stub web: evita importar expo-notifications (registra listener não suportado
// no load) e mantém a mesma API como no-op.
export async function setupSyncNotificationChannel() {}
export async function requestSyncNotificationPermission() {}
export async function showSyncNotification() {}
export async function dismissSyncNotification() {}
