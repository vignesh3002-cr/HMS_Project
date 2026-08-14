import React, { useMemo, useState } from "react";

type SortOption = "recent" | "rating" | "name";

interface Review {
  id: number;
  name: string;
  initials: string;
  date: string;
  displayDate: string;
  rating: number;
  text: string;
  avatarClass: string;
}

const reviews: Review[] = [
  {
    id: 1,
    name: "Marcus T.",
    initials: "MT",
    date: "2024-10-12",
    displayDate: "Oct 12",
    rating: 5,
    avatarClass: "bg-[#b2c5ff] text-[#001848]",
    text: `"Dr. Jenkins was incredibly thorough. She took the time to explain my cholesterol levels in a way I could actually understand. I felt very heard and respected throughout the entire appointment."`,
  },
  {
    id: 2,
    name: "Elena L.",
    initials: "EL",
    date: "2024-09-28",
    displayDate: "Sept 28",
    rating: 5,
    avatarClass: "bg-[#6ae1ff] text-[#006374]",
    text: `"Finally found a doctor who doesn't rush you out the door. The clinic staff was professional and the atmosphere was very calming. Highly recommend for anyone with heart health anxiety."`,
  },
  {
    id: 3,
    name: "Robert B.",
    initials: "RB",
    date: "2024-09-15",
    displayDate: "Sept 15",
    rating: 4,
    avatarClass: "bg-[#65dca4] text-[#002113]",
    text: `"Great experience for my annual checkup. The office is clean and tech-forward. Sarah answered all my questions about my new medication with such patience. A true professional."`,
  },
  {
    id: 4,
    name: "Julie S.",
    initials: "JS",
    date: "2024-08-30",
    displayDate: "Aug 30",
    rating: 5,
    avatarClass: "bg-[#ffdad6] text-[#93000a]",
    text: `"The booking process through HealthTrust was seamless. Dr. Jenkins' diagnostic approach is very logical and reassuring. I will definitely be returning for my follow-up next year."`,
  },
  {
    id: 5,
    name: "Alan D.",
    initials: "AD",
    date: "2024-08-14",
    displayDate: "Aug 14",
    rating: 5,
    avatarClass: "bg-[#dae2ff] text-[#001848]",
    text: `"The best cardiologist I've seen in the city. Professional, punctual, and highly skilled. She really cares about her patients' long-term wellbeing rather than just temporary fixes."`,
  },
];

const StarRating: React.FC<{
  rating: number;
  size?: "small" | "large";
}> = ({ rating, size = "small" }) => {
  return (
    <div
      className={`flex items-center ${
        size === "large" ? "gap-0" : "gap-0"
      }`}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`flex items-center justify-center leading-none ${
            size === "large"
              ? "h-[19px] w-5 text-[18px]"
              : "h-[19px] w-[18px] text-[17px]"
          } ${
            star <= rating ? "text-[#ffb000]" : "text-[#ffb000]"
          }`}
        >
          {star <= rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
};

const StatIcon: React.FC<{ type: number }> = ({ type }) => {
  if (type === 1) {
    return (
      <svg
        width="27"
        height="24"
        viewBox="0 0 27 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-[27px]"
      >
        <path
          d="M13.5 21.5C13.5 21.5 2 15.7 2 8.9C2 5.4 4.5 3 7.7 3C9.9 3 11.8 4.2 13.5 6C15.2 4.2 17.1 3 19.3 3C22.5 3 25 5.4 25 8.9C25 15.7 13.5 21.5 13.5 21.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 2) {
    return (
      <svg
        width="27"
        height="24"
        viewBox="0 0 27 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-[27px]"
      >
        <circle
          cx="13.5"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M8 12L11.5 15.5L19 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 3) {
    return (
      <svg
        width="27"
        height="24"
        viewBox="0 0 27 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-[27px]"
      >
        <circle
          cx="13.5"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M13.5 7V12L17 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="27"
      height="24"
      viewBox="0 0 27 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-[27px]"
    >
      <path
        d="M13.5 3L16.4 8.9L23 9.9L18.25 14.5L19.4 21L13.5 17.9L7.6 21L8.75 14.5L4 9.9L10.6 8.9L13.5 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const CalendarIcon: React.FC = () => {
  return (
    <svg
      width="16"
      height="18"
      viewBox="0 0 16 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[17px] w-[15px]"
    >
      <rect
        x="1"
        y="3"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4 1V5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 1V5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M1 7H15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};

const App: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [toast, setToast] = useState<string>("");

  const showToast = (message: string) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2200);
  };

  const sortedReviews = useMemo(() => {
    const result = [...reviews];

    if (sortBy === "rating") {
      return result.sort((a, b) => b.rating - a.rating);
    }

    if (sortBy === "name") {
      return result.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );
  }, [sortBy]);

  const handleBookDoctor = () => {
    showToast("Opening appointment booking...");
  };

  const handleViewAllReviews = () => {
    showToast("Opening all patient reviews...");
  };

  return (
    <div className="min-h-screen w-full bg-[#e7e7e7] font-[Inter,Arial,Helvetica,sans-serif] text-[#191c1e]">

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="flex min-h-screen w-full flex-col gap-8 p-12 max-[1100px]:p-8 max-[760px]:gap-6 max-[760px]:p-5 max-[480px]:p-3.5">

        {/* ===================================================
            PROFILE HEADER
        ==================================================== */}

        <section className="flex w-full items-center gap-8 max-[1100px]:items-start max-[760px]:flex-col">

          {/* Doctor Photo */}

          <div className="relative h-32 w-32 shrink-0 self-center max-[1100px]:self-start max-[760px]:self-center">

            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-[#edeef0] p-1 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">

              <img
                src="https://www.figma.com/api/mcp/asset/13061ea1-ae7b-49cb-a282-f6a3174e1e42.png"
                alt="Dr. Sarah Jenkins"
                className="block h-full w-full rounded-full object-cover"
              />

            </div>

            {/* Verification */}

            <div className="absolute -bottom-px -right-0.5 z-10 flex h-[34px] w-[29px] items-center justify-center rounded-full border-2 border-[#e7e7e7] bg-[#006844] text-base text-white">
              ✓
            </div>

          </div>


          {/* Profile Content */}

          <div className="flex min-w-0 flex-1 flex-col gap-4">

            {/* Name + Rating */}

            <div className="flex w-full items-center justify-between gap-5 max-[1100px]:items-start max-[760px]:flex-col">

              {/* Doctor Name */}

              <div className="flex flex-col gap-1">

                <h1 className="whitespace-nowrap text-[32px] font-bold leading-10 tracking-[-0.64px] max-[1100px]:whitespace-normal max-[480px]:text-[26px] max-[480px]:leading-[34px]">
                  Dr. Sarah Jenkins, MD
                </h1>

                <div className="whitespace-nowrap text-sm font-semibold uppercase leading-4 tracking-[0.35px] text-[#00687a] max-[1100px]:whitespace-normal">
                  BOARD CERTIFIED CARDIOLOGIST • 12 YEARS EXP.
                </div>

              </div>


              {/* Rating */}

              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#c3c6d6] bg-[#f3f4f6] px-[17px] py-[13px] max-[760px]:self-start max-[480px]:w-full max-[480px]:justify-center">

                <StarRating
                  rating={5}
                  size="large"
                />

                <div className="text-xl font-bold leading-7">
                  4.9
                </div>

                <div className="text-sm leading-5 text-[#434654]">
                  (1,248 Reviews)
                </div>

              </div>

            </div>


            {/* Tags */}

            <div className="flex w-full items-stretch gap-2 max-[760px]:flex-wrap">

              <div className="whitespace-nowrap rounded-full bg-[#e7e8ea] px-3 py-1 text-sm leading-5 text-[#434654]">
                Preventative Care
              </div>

              <div className="whitespace-nowrap rounded-full bg-[#e7e8ea] px-3 py-1 text-sm leading-5 text-[#434654]">
                Heart Failure Specialist
              </div>

              <div className="whitespace-nowrap rounded-full bg-[#e7e8ea] px-3 py-1 text-sm leading-5 text-[#434654]">
                Telehealth Available
              </div>

            </div>

          </div>

        </section>


        {/* ===================================================
            STATISTICS
        ==================================================== */}

        <section className="grid w-full grid-cols-4 gap-6 pt-4 max-[1100px]:grid-cols-2 max-[760px]:grid-cols-2 max-[760px]:gap-4 max-[480px]:grid-cols-1">

          {/* Stat 1 */}

          <div className="flex min-h-[107px] min-w-0 flex-col items-center justify-center rounded-xl border border-[rgba(195,198,214,0.3)] bg-white p-[25px] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">

            <div className="mb-2 flex h-6 items-center justify-center">
              <StatIcon type={1} />
            </div>

            <div className="text-center text-xl font-semibold leading-7">
              5,000+
            </div>

            <div className="text-center text-sm leading-5 text-[#434654]">
              Patients Served
            </div>

          </div>


          {/* Stat 2 */}

          <div className="flex min-h-[107px] min-w-0 flex-col items-center justify-center rounded-xl border border-[rgba(195,198,214,0.3)] bg-white p-[25px] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">

            <div className="mb-2 flex h-6 items-center justify-center">
              <StatIcon type={2} />
            </div>

            <div className="text-center text-xl font-semibold leading-7">
              98%
            </div>

            <div className="text-center text-sm leading-5 text-[#434654]">
              On-Time Starts
            </div>

          </div>


          {/* Stat 3 */}

          <div className="flex min-h-[107px] min-w-0 flex-col items-center justify-center rounded-xl border border-[rgba(195,198,214,0.3)] bg-white p-[25px] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">

            <div className="mb-2 flex h-6 items-center justify-center">
              <StatIcon type={3} />
            </div>

            <div className="text-center text-xl font-semibold leading-7">
              15 mins
            </div>

            <div className="text-center text-sm leading-5 text-[#434654]">
              Avg. Wait Time
            </div>

          </div>


          {/* Stat 4 */}

          <div className="flex min-h-[107px] min-w-0 flex-col items-center justify-center rounded-xl border border-[rgba(195,198,214,0.3)] bg-white p-[25px] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">

            <div className="mb-2 flex h-6 items-center justify-center">
              <StatIcon type={4} />
            </div>

            <div className="text-center text-xl font-semibold leading-7">
              Top 1%
            </div>

            <div className="text-center text-sm leading-5 text-[#434654]">
              Regional Rank
            </div>

          </div>

        </section>


        {/* ===================================================
            REVIEWS HEADER
        ==================================================== */}

        <section className="flex w-full items-center justify-between pt-4 max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-3">

          <h2 className="text-2xl font-semibold leading-8">
            Patient Reviews
          </h2>


          {/* Sort */}

          <div className="relative max-[480px]:w-full">

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as SortOption
                )
              }
              className="min-w-[150px] cursor-pointer appearance-none border-0 bg-transparent px-3 py-2 pr-10 text-sm leading-5 text-[#191c1e] outline-none max-[480px]:w-full"
            >
              <option value="recent">
                Most Recent
              </option>

              <option value="rating">
                Highest Rated
              </option>

              <option value="name">
                Patient Name
              </option>
            </select>

            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#434654]">
              ⌄
            </span>

          </div>

        </section>


        {/* ===================================================
            REVIEW GRID
        ==================================================== */}

        <section className="grid w-full grid-cols-3 grid-rows-[360px_334px] gap-6 max-[1100px]:grid-cols-2 max-[1100px]:grid-rows-none max-[760px]:grid-cols-1">

          {sortedReviews.map((review) => (

            <article
              key={review.id}
              className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#c3c6d6] bg-white p-[25px] shadow-[0_1px_1px_rgba(0,0,0,0.05)] max-[760px]:min-h-[320px]"
            >

              {/* Review Content */}

              <div className="flex w-full flex-col gap-4 pb-6">

                {/* Patient + Stars */}

                <div className="flex w-full items-center justify-between gap-3 pr-1 max-[480px]:items-start">

                  {/* Patient */}

                  <div className="flex min-w-0 items-center gap-3">

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold leading-6 ${review.avatarClass}`}
                    >
                      {review.initials}
                    </div>


                    <div className="flex min-w-0 flex-col">

                      <div className="text-base font-bold leading-6 text-[#191c1e]">
                        {review.name}
                      </div>

                      <div className="text-sm leading-5 text-[#434654]">
                        Verified Patient •
                        <br />
                        {review.displayDate}
                      </div>

                    </div>

                  </div>


                  {/* Stars */}

                  <div className="flex h-[19px] w-[90px] shrink-0 items-center justify-center">
                    <StarRating rating={review.rating} />
                  </div>

                </div>


                {/* Review Text */}

                <p className="w-full text-base italic leading-[26px] text-[#434654]">
                  {review.text}
                </p>

              </div>


              {/* Book Button */}

              <button
                type="button"
                onClick={handleBookDoctor}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#003d9b] bg-white px-1 py-[13px] text-base leading-6 text-[#003d9b] transition-colors duration-200 hover:bg-[#f0f5ff]"
              >

                <span className="flex h-[17px] w-[15px] items-center justify-center">
                  <CalendarIcon />
                </span>

                <span>
                  Book with Dr. Sarah
                </span>

              </button>

            </article>

          ))}


          {/* =================================================
              MORE REVIEWS
          ================================================== */}

          <article className="flex min-h-[334px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#737685] bg-[#edeef0] p-[25px]">

            {/* Icon */}

            <div className="flex h-10 w-10 items-center justify-center text-[36px] text-[#737685]">
              ♧
            </div>


            {/* Text */}

            <div className="text-center text-base leading-6 text-[#434654]">
              1,243 more reviews available
            </div>


            {/* View All */}

            <button
              type="button"
              onClick={handleViewAllReviews}
              className="border-0 bg-transparent text-base font-bold leading-6 text-[#003d9b]"
            >
              View All Reviews
            </button>

          </article>

        </section>

      </main>


      {/* =====================================================
          TOAST
      ====================================================== */}

      <div
        className={`fixed bottom-6 right-6 z-[9999] rounded-[10px] bg-[#003d9b] px-[18px] py-3 text-sm text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-300 ${
          toast
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        {toast}
      </div>

    </div>
  );
};

export default App;