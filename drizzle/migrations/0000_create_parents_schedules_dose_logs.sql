CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🌸',
  phone text,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT ALL ON public.parents TO service_role;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own parents select" ON public.parents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own parents insert" ON public.parents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own parents update" ON public.parents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own parents delete" ON public.parents FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  label text NOT NULL,
  dose_time time NOT NULL,
  medicines text[] NOT NULL DEFAULT '{}',
  hospital text,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_schedules TO authenticated;
GRANT ALL ON public.medication_schedules TO service_role;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schedules select" ON public.medication_schedules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own schedules insert" ON public.medication_schedules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own schedules update" ON public.medication_schedules FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own schedules delete" ON public.medication_schedules FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.medication_schedules(parent_id);

CREATE TABLE public.dose_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'done',
  taken_at timestamptz,
  condition text,
  symptoms text[] NOT NULL DEFAULT '{}',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dose_logs TO authenticated;
GRANT ALL ON public.dose_logs TO service_role;
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs select" ON public.dose_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own logs insert" ON public.dose_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own logs update" ON public.dose_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own logs delete" ON public.dose_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.dose_logs(parent_id, log_date);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER parents_touch BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();