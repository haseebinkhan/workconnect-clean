import { WorkerItem } from "@/types/worker";

export type JobMatchInput = {
  id: string;
  title: string;
  description: string;
  city?: string | null;
  area_slug?: string | null;
  category?: string | null;
  preferred_day?: string | null;
  preferred_shift?: string | null;
};

export type WorkerMatchResult = {
  worker: WorkerItem;
  score: number;
  reasons: string[];
};

function normalize(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function tokenize(value: string | null | undefined): string[] {
  return normalize(value)
    .replace(/[^a-z0-9\s/&-]/gi, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const aSet = new Set(a);
  const bSet = new Set(b);

  let matches = 0;
  for (const token of aSet) {
    if (bSet.has(token)) matches++;
  }

  return matches;
}

function matchesAvailability(
  availability: Record<string, string[]>,
  preferredDay?: string | null,
  preferredShift?: string | null
): boolean {
  const day = normalize(preferredDay);
  const shift = normalize(preferredShift);

  if (!day && !shift) return false;

  if (day) {
    const shifts = availability[day] || [];
    if (!shift) return shifts.length > 0;
    return shifts.map((s) => normalize(s)).includes(shift);
  }

  if (shift) {
    return Object.values(availability).some((shifts) =>
      shifts.map((s) => normalize(s)).includes(shift)
    );
  }

  return false;
}

export function scoreWorkerForJob(
  job: JobMatchInput,
  worker: WorkerItem
): WorkerMatchResult {
  let score = 0;
  const reasons: string[] = [];

  const jobCategory = normalize(job.category);
  const workerCategory = normalize(worker.category);
  const jobArea = normalize(job.area_slug);
  const workerArea = normalize(worker.area_slug);

  const jobTokens = tokenize(`${job.title} ${job.description} ${job.category || ""}`);
  const workerTokens = tokenize(
    `${worker.headline || ""} ${worker.description || ""} ${worker.category || ""}`
  );

  if (worker.is_open_to_work) {
    score += 15;
    reasons.push("Open to work");
  }

  if (jobCategory && workerCategory && jobCategory === workerCategory) {
    score += 35;
    reasons.push("Category match");
  } else if (jobCategory && workerCategory) {
    const overlap = overlapScore(tokenize(jobCategory), tokenize(workerCategory));
    if (overlap > 0) {
      score += 15;
      reasons.push("Related category");
    }
  }

  if (jobArea && workerArea && jobArea === workerArea) {
    score += 25;
    reasons.push("Same area");
  }

  if (
    matchesAvailability(
      worker.availability || {},
      job.preferred_day,
      job.preferred_shift
    )
  ) {
    score += 20;
    reasons.push("Availability match");
  }

  const textOverlap = overlapScore(jobTokens, workerTokens);
  if (textOverlap > 0) {
    score += Math.min(textOverlap * 2, 10);
  }

  if (worker.rating_avg >= 4.8) {
    score += 15;
    reasons.push("Top rated");
  } else if (worker.rating_avg >= 4.5) {
    score += 12;
    reasons.push("Strong rating");
  } else if (worker.rating_avg >= 4.0) {
    score += 8;
    reasons.push("Good rating");
  } else if (worker.rating_avg >= 3.5) {
    score += 4;
  }

  if (worker.jobs_completed >= 20) {
    score += 8;
    reasons.push("Experienced");
  } else if (worker.jobs_completed >= 10) {
    score += 5;
  } else if (worker.jobs_completed >= 3) {
    score += 2;
  }

  return {
    worker,
    score,
    reasons: [...new Set(reasons)].slice(0, 4),
  };
}

export function rankWorkersForJob(
  job: JobMatchInput,
  workers: WorkerItem[]
): WorkerMatchResult[] {
  return workers
    .map((worker) => scoreWorkerForJob(job, worker))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function scoreWorkerForSearch(
  worker: WorkerItem,
  preferredArea?: string
): number {
  let score = 0;

  if (worker.is_open_to_work) score += 20;

  if (worker.rating_avg >= 4.8) {
    score += 20;
  } else if (worker.rating_avg >= 4.5) {
    score += 16;
  } else if (worker.rating_avg >= 4.0) {
    score += 12;
  } else if (worker.rating_avg >= 3.5) {
    score += 8;
  } else {
    score += Math.max(worker.rating_avg, 0);
  }

  if (worker.jobs_completed >= 20) {
    score += 15;
  } else if (worker.jobs_completed >= 10) {
    score += 10;
  } else if (worker.jobs_completed >= 3) {
    score += 5;
  }

  if (
    preferredArea &&
    worker.area_slug &&
    normalize(preferredArea) === normalize(worker.area_slug)
  ) {
    score += 15;
  }

  if (worker.headline) score += 5;
  if (worker.description) score += 5;
  if (worker.category) score += 5;

  if (worker.certifications && worker.certifications.length > 0) {
    score += Math.min(worker.certifications.length * 2, 8);
  }

  if (worker.experience_years && worker.experience_years > 0) {
    score += Math.min(worker.experience_years, 10);
  }

  return score;
}