create policy "Users can delete own courses"
  on public.courses for delete
  using (auth.uid() = user_id);
