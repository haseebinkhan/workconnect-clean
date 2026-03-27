export type AccessSourceProfile = {
  worker_enabled?: boolean | null;
  hirer_enabled?: boolean | null;
  is_active?: boolean | null;
  is_admin?: boolean | null;
  role?: string | null;
};

export type AccessResult = {
  isActive: boolean;
  isAdmin: boolean;

  canBrowseJobs: boolean;
  canApplyJobs: boolean;

  canBrowseWorkers: boolean;
  canSendWorkerRequest: boolean;

  canPostJobs: boolean;
  canReceiveRequests: boolean;
};

export function buildAccess(profile: AccessSourceProfile | null | undefined): AccessResult {
  const isActive = profile?.is_active === true;
  const isAdmin = profile?.is_admin === true || profile?.role === "admin";

  const workerEnabled = profile?.worker_enabled === true;
  const hirerEnabled = profile?.hirer_enabled === true;

  return {
    isActive,
    isAdmin,

    canBrowseJobs: isActive && workerEnabled,
    canApplyJobs: isActive && workerEnabled,

    canBrowseWorkers: isActive && hirerEnabled,
    canSendWorkerRequest: isActive && hirerEnabled,

    canPostJobs: isActive && hirerEnabled,
    canReceiveRequests: isActive && workerEnabled,
  };
}
