import { DOCTOR_PROFILE, PATIENT_REVIEWS, REVIEW_STATS } from "../data/reviewData";
import type { DoctorProfile, PatientReview, ReviewStat } from "../types";

/* ---------- DoctorProfileHeader ---------- */

function DoctorProfileHeader({ doctor }: { doctor: DoctorProfile }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={doctor.avatarUrl}
            alt={doctor.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">{doctor.name}</h2>
          <p className="text-xs font-semibold tracking-wide text-emerald-600 mt-0.5">{doctor.credentials}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            {doctor.tags.map((tag, i) => (
              <span key={tag} className="flex items-center gap-3">
                {tag}
                {i < doctor.tags.length - 1 && <span className="text-gray-300">•</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 px-5 py-3 flex items-center gap-2 shadow-sm">
        <span className="text-amber-400 text-lg tracking-tight">★★★★★</span>
        <span className="text-lg font-bold text-gray-900">{doctor.rating}</span>
        <span className="text-sm text-gray-400">({doctor.reviewCount.toLocaleString()} reviews)</span>
      </div>
    </div>
  );
}

/* ---------- ReviewStatCard ---------- */

const REVIEW_ICONS: Record<ReviewStat["icon"], JSX.Element> = {
  patients: (
    <svg className="w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 2.7-6 7-6s7 2.7 7 6" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M15 20c0-2.4 1-4.3 3-5.2" />
    </svg>
  ),
  onTime: (
    <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  waitTime: (
    <svg className="w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h5" />
      <path d="M9 21l3-3 3 3" />
    </svg>
  ),
  topRank: (
    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21s-7-4.5-9.3-9C1 8.5 2.7 5 6 5c2 0 3.3 1 4 2 .7-1 2-2 4-2 3.3 0 5 3.5 3.3 7-2.3 4.5-9.3 9-9.3 9z" />
    </svg>
  ),
};

function ReviewStatCard({ stat }: { stat: ReviewStat }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center text-center gap-2">
      <span className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">{REVIEW_ICONS[stat.icon]}</span>
      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
      <p className="text-xs text-gray-400">{stat.label}</p>
    </div>
  );
}

/* ---------- PatientReviewCard ---------- */

function PatientReviewCard({ review }: { review: PatientReview }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
      <div className="flex items-center gap-3">
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${review.avatarBg} ${review.avatarText}`}
        >
          {review.initials}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{review.patientName}</p>
          <p className="text-xs text-gray-400">
            {review.verified ? "Verified Patient" : "Patient"} • {review.date}
          </p>
        </div>
      </div>

      <div className="text-amber-400 text-sm mt-3">
        {"★".repeat(review.rating)}
        <span className="text-gray-200">{"★".repeat(5 - review.rating)}</span>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed mt-2 flex-1">"{review.comment}"</p>

      <button className="mt-4 flex items-center justify-center gap-2 border border-blue-200 text-blue-700 text-sm font-semibold rounded-lg py-2.5 hover:bg-blue-50 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
        Book with Dr. Sarah
      </button>
    </div>
  );
}

/* ---------- MoreReviewsCard ---------- */

function MoreReviewsCard({ remainingCount }: { remainingCount: number }) {
  return (
    <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[240px]">
      <span className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.5 8.5 0 01-3-.6L3 21l1.7-4.5a8.4 8.4 0 01-1.2-4.4A8.4 8.4 0 0112 3.5a8.4 8.4 0 019 8z" />
          <path d="M12 8v.01M8.5 8v.01M15.5 8v.01" />
        </svg>
      </span>
      <p className="text-sm text-gray-500">{remainingCount.toLocaleString()} more reviews available</p>
      <button className="text-sm font-semibold text-blue-700 hover:underline">View All Reviews</button>
    </div>
  );
}

/* ---------- ReviewPage ---------- */

export default function ReviewPage() {
  const shownCount = PATIENT_REVIEWS.length;
  const remainingCount = DOCTOR_PROFILE.reviewCount - shownCount;

  return (
    <div className="space-y-6">
      <DoctorProfileHeader doctor={DOCTOR_PROFILE} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {REVIEW_STATS.map((stat) => (
          <ReviewStatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Patient Reviews</h3>
        <div className="relative">
          <select className="appearance-none text-sm bg-transparent border-none pr-6 text-gray-600 font-medium outline-none cursor-pointer">
            <option>Most Recent</option>
            <option>Highest Rated</option>
            <option>Lowest Rated</option>
          </select>
          <svg
            className="w-3.5 h-3.5 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PATIENT_REVIEWS.map((review) => (
          <PatientReviewCard key={review.id} review={review} />
        ))}
        <MoreReviewsCard remainingCount={remainingCount} />
      </div>
    </div>
  );
}
