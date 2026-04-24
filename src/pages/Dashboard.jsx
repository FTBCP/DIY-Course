import Header from '../components/Header'

export default function Dashboard() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-warm-white pt-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-tan font-semibold mb-4">
            Your courses
          </p>
          <h1 className="font-serif text-4xl font-medium text-dark-brown tracking-tight mb-2">
            Welcome to <em className="text-terracotta italic font-normal">DIY Courses</em>
          </h1>
          <p className="text-warm-gray text-lg mb-10">
            You haven't created any courses yet. Start your first one below.
          </p>
          <button
            id="start-course-btn"
            className="bg-dark-brown text-warm-white py-4 px-8 rounded text-[15px] font-medium tracking-wide hover:bg-terracotta transition-all inline-flex items-center gap-2"
          >
            Start a new course →
          </button>
        </div>
      </div>
    </>
  )
}
