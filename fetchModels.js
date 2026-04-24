const url = "https://kwgmtjtncoorgpspgvfi.supabase.co/functions/v1/generate-course";
fetch(url, {
  method: "POST",
  headers: {
    "Authorization": "Bearer sb_publishable_3AYIglbz1V7rDVAQJ4kP6w_N9Bk0rJI",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({topic: "list-models", depth: "overview", time: "afternoon"})
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(console.error);
