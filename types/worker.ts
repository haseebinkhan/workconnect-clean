export type WorkerAvailability = Record<string, string[]>;

export type WorkerItem = {
  id: string;
  user_id: string;
  headline: string | null;
  description: string | null;

  hourly_rate: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;

  experience_years: number;
  certifications: string[];
  availability_notes: string | null;

  rating_avg: number;
  rating_count: number;
  jobs_completed: number;

  area_slug: string | null;
  city: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;

  is_open_to_work: boolean;
  availability: WorkerAvailability;
};

export type WorkerProfileDB = {
  id: string;
  user_id: string;
  headline: string | null;
  description: string | null;

  hourly_rate: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;

  experience_years: number | null;
  certifications: string[] | null;
  availability_notes: string | null;

  rating_avg: number | null;
  rating_count: number | null;
  jobs_completed: number | null;

  area_slug: string | null;
  city: string | null;
  category: string | null;

  is_open_to_work: boolean | null;
  availability: unknown;
};

export type WorkerNamesMap = Record<
  string,
  {
    full_name: string | null;
    city: string | null;
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
  }
>;
