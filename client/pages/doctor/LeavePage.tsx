import React, { useState } from "react";

type AbsenceType = "Emergency" | "Vacation" | "Sick Leave";

interface AbsenceTypeOption {
  name: AbsenceType;
  icon: string;
  className: string;
}

interface LoggedAbsence {
  type: AbsenceType;
  duration: string;
  date: string;
  icon: string;
}

interface ChecklistState {
  handover: boolean;
  followups: boolean;
  emr: boolean;
  cover: boolean;
}

const AbsenceManagement: React.FC = () => {
  const [selectedType, setSelectedType] =
    useState<AbsenceType>("Emergency");

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [handoverDetails, setHandoverDetails] =
    useState<string>("");

  const [checklist, setChecklist] =
    useState<ChecklistState>({
      handover: false,
      followups: false,
      emr: true,
      cover: false,
    });

  const [toast, setToast] = useState<string>("");

  const absenceTypes: AbsenceTypeOption[] = [
    {
      name: "Emergency",
      icon: "https://www.figma.com/api/mcp/asset/f27ad97a-e294-4e2d-9324-2393879dceae.svg",
      className: "h-6 w-[23px]",
    },
    {
      name: "Vacation",
      icon: "https://www.figma.com/api/mcp/asset/d540afb8-df30-4b15-8f80-c10819746f2c.svg",
      className: "h-[27px] w-[27px]",
    },
    {
      name: "Sick Leave",
      icon: "https://www.figma.com/api/mcp/asset/d68dcd29-b02f-4d0b-98ff-31117d9f1eca.svg",
      className: "h-[27px] w-7",
    },
  ];

  const loggedAbsences: LoggedAbsence[] = [
    {
      type: "Vacation",
      duration: "Oct 12 - Oct 15 (4 Days)",
      date: "Sep 28, 2023",
      icon: "https://www.figma.com/api/mcp/asset/d82072ef-6a79-44c2-bac8-fc24ec98ebe7.svg",
    },
    {
      type: "Sick Leave",
      duration: "Sep 05 - Sep 06 (2 Days)",
      date: "Sep 05, 2023",
      icon: "https://www.figma.com/api/mcp/asset/e0afd6f3-107f-4eaa-b336-b59cfe32ccb5.svg",
    },
    {
      type: "Emergency",
      duration: "Aug 20 (1 Day)",
      date: "Aug 20, 2023",
      icon: "https://www.figma.com/api/mcp/asset/5f848e32-7a8d-43ff-932a-89192bc8307f.svg",
    },
  ];

  /*
   * =========================================================
   * TOAST
   * =========================================================
   */

  const showToast = (message: string): void => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2500);
  };

  /*
   * =========================================================
   * DATE FORMATTER
   * =========================================================
   */

  const formatDate = (value: string): string => {
    let numbers = value.replace(/\D/g, "");

    if (numbers.length > 8) {
      numbers = numbers.substring(0, 8);
    }

    if (numbers.length >= 5) {
      return (
        numbers.substring(0, 2) +
        "/" +
        numbers.substring(2, 4) +
        "/" +
        numbers.substring(4)
      );
    }

    if (numbers.length >= 3) {
      return (
        numbers.substring(0, 2) +
        "/" +
        numbers.substring(2)
      );
    }

    return numbers;
  };

  /*
   * =========================================================
   * FORM SUBMIT
   * =========================================================
   */

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ): void => {
    event.preventDefault();

    if (!startDate.trim()) {
      showToast("Please enter the start date.");
      return;
    }

    if (!endDate.trim()) {
      showToast("Please enter the end date.");
      return;
    }

    showToast(
      `${selectedType} absence confirmed successfully.`
    );
  };

  /*
   * =========================================================
   * CANCEL
   * =========================================================
   */

  const handleCancel = (): void => {
    setSelectedType("Emergency");
    setStartDate("");
    setEndDate("");
    setHandoverDetails("");

    showToast("Form cleared.");
  };

  /*
   * =========================================================
   * CHECKLIST
   * =========================================================
   */

  const toggleChecklist = (
    key: keyof ChecklistState
  ): void => {
    setChecklist((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  /*
   * =========================================================
   * DOWNLOAD CSV
   * =========================================================
   */

  const handleDownload = (): void => {
    const archive: string[][] = [
      [
        "Absence Type",
        "Duration",
        "Date Logged",
      ],
      [
        "Vacation",
        "Oct 12 - Oct 15 (4 Days)",
        "Sep 28, 2023",
      ],
      [
        "Sick Leave",
        "Sep 05 - Sep 06 (2 Days)",
        "Sep 05, 2023",
      ],
      [
        "Emergency",
        "Aug 20 (1 Day)",
        "Aug 20, 2023",
      ],
    ];

    const csv: string = archive
      .map((row: string[]) =>
        row
          .map(
            (value: string) =>
              `"${value.replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob: Blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url: string =
      URL.createObjectURL(blob);

    const link: HTMLAnchorElement =
      document.createElement("a");

    link.href = url;
    link.download = "absence-archive.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showToast("Archive downloaded.");
  };

  /*
   * =========================================================
   * JSX
   * =========================================================
   */

  return (
    <div className="min-h-screen w-full overflow-x-auto bg-white font-['Inter',Arial,sans-serif] text-[#191c1d]">

      {/* =====================================================
          PAGE
      ====================================================== */}

      <div className="min-h-screen w-full p-0 sm:p-[10px]">

        <div className="mx-auto flex w-full max-w-[1008px] flex-col gap-[23px] px-3 sm:px-0">

          {/* =================================================
              HEADER
          ================================================= */}

          <header className="flex min-h-[64px] w-full items-center justify-between border-b border-[#c3c6d5] bg-white px-4 sm:px-6">

            {/* Breadcrumb */}

            <div className="flex items-center gap-2">

              <span className="whitespace-nowrap text-[12px] font-semibold leading-4 tracking-[0.6px] text-[#434653]">
                Dashboard
              </span>

              <img
                src="https://www.figma.com/api/mcp/asset/55e95392-3e6b-44bb-be26-ce3acca0a200.svg"
                alt=""
                className="h-[7px] w-[4px]"
              />

              <span className="whitespace-nowrap text-[12px] font-bold leading-4 tracking-[0.6px] text-[#00327d]">
                Absence Management
              </span>

            </div>


            {/* Header right */}

            <div className="flex items-center gap-4">

              <button
                type="button"
                aria-label="Notifications"
                onClick={() =>
                  showToast(
                    "No new notifications."
                  )
                }
                className="flex h-12 w-12 items-center justify-center rounded-xl transition hover:bg-[#f5f6f8]"
              >

                <img
                  src="https://www.figma.com/api/mcp/asset/8a71a457-9707-42bc-90f5-6f1380855c99.svg"
                  alt=""
                  className="h-5 w-4"
                />

              </button>


              <div className="h-8 w-px bg-[#c3c6d6]" />


              <div className="flex items-center gap-2 pl-2">

                <span className="hidden whitespace-nowrap font-['Manrope'] text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434654] sm:block">
                  May 30, 2026
                </span>

                <img
                  src="https://www.figma.com/api/mcp/asset/da0f9f5f-0fae-47cd-97c1-242b9cecea30.svg"
                  alt=""
                  className="h-5 w-[18px]"
                />

              </div>

            </div>

          </header>


          {/* =================================================
              MAIN
          ================================================= */}

          <main className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">

            {/* =================================================
                LEFT
            ================================================= */}

            <section className="flex flex-col gap-6 lg:col-span-8">

              {/* =================================================
                  ABSENCE FORM CARD
              ================================================= */}

              <section className="rounded-[4px] border border-[#c3c6d5] bg-white px-5 py-6 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:px-6">

                {/* Heading */}

                <div className="mb-6">

                  <h1 className="text-[24px] font-semibold leading-8 text-[#191c1d]">
                    Absence Management
                  </h1>

                  <p className="mt-1 w-full text-[14px] font-normal leading-6 text-[#434653] sm:text-[16px]">
                    Self-service log for planned or
                    emergency absences. Ensure clinical
                    handovers are scheduled.
                  </p>

                </div>


                {/* Form */}

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-6"
                >

                  {/* =========================================
                      ABSENCE TYPE
                  ========================================== */}

                  <div className="flex flex-col gap-2">

                    <label className="text-[11px] font-medium uppercase leading-[14px] text-[#434653]">
                      SELECT ABSENCE TYPE
                    </label>


                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                      {absenceTypes.map(
                        (
                          type: AbsenceTypeOption
                        ) => {

                          const isSelected =
                            selectedType ===
                            type.name;

                          return (
                            <button
                              key={type.name}
                              type="button"
                              onClick={() =>
                                setSelectedType(
                                  type.name
                                )
                              }
                              className={`
                                flex
                                h-[108px]
                                flex-col
                                items-center
                                justify-center
                                rounded-[4px]
                                transition
                                ${
                                  isSelected
                                    ? "border-2 border-[#00327d] bg-[#dbe3f1]"
                                    : "border border-[#c3c6d5] bg-white hover:border-[#00327d]"
                                }
                              `}
                            >

                              <div className="mb-2 flex h-8 items-center justify-center">

                                <img
                                  src={type.icon}
                                  alt=""
                                  className={type.className}
                                />

                              </div>


                              <span className="whitespace-nowrap text-[12px] font-semibold leading-4 tracking-[0.6px] text-[#191c1d]">
                                {type.name}
                              </span>

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>


                  {/* =========================================
                      DATE FIELDS
                  ========================================== */}

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

                    {/* Start */}

                    <div className="flex flex-col gap-1">

                      <label
                        htmlFor="startDate"
                        className="text-[11px] font-medium leading-[14px] text-[#434653]"
                      >
                        START DATE
                      </label>

                      <input
                        id="startDate"
                        type="text"
                        value={startDate}
                        maxLength={10}
                        placeholder="mm/dd/yyyy"
                        autoComplete="off"
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) =>
                          setStartDate(
                            formatDate(
                              event.target.value
                            )
                          )
                        }
                        className="
                          h-[50px]
                          w-full
                          rounded-[2px]
                          border
                          border-[#c3c6d5]
                          bg-white
                          px-[13px]
                          text-[16px]
                          leading-6
                          text-[#191c1d]
                          outline-none
                          placeholder:text-[#191c1d]
                          focus:border-[#00327d]
                          focus:ring-1
                          focus:ring-[#00327d]
                        "
                      />

                    </div>


                    {/* End */}

                    <div className="flex flex-col gap-1">

                      <label
                        htmlFor="endDate"
                        className="text-[11px] font-medium leading-[14px] text-[#434653]"
                      >
                        END DATE
                      </label>

                      <input
                        id="endDate"
                        type="text"
                        value={endDate}
                        maxLength={10}
                        placeholder="mm/dd/yyyy"
                        autoComplete="off"
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) =>
                          setEndDate(
                            formatDate(
                              event.target.value
                            )
                          )
                        }
                        className="
                          h-[50px]
                          w-full
                          rounded-[2px]
                          border
                          border-[#c3c6d5]
                          bg-white
                          px-[13px]
                          text-[16px]
                          leading-6
                          text-[#191c1d]
                          outline-none
                          placeholder:text-[#191c1d]
                          focus:border-[#00327d]
                          focus:ring-1
                          focus:ring-[#00327d]
                        "
                      />

                    </div>

                  </div>


                  {/* =========================================
                      HANDOVER
                  ========================================== */}

                  <div className="flex flex-col gap-1">

                    <label
                      htmlFor="handover"
                      className="text-[11px] font-medium uppercase leading-[14px] text-[#434653]"
                    >
                      CLINICAL HANDOVER DETAILS
                    </label>

                    <textarea
                      id="handover"
                      value={handoverDetails}
                      onChange={(
                        event: React.ChangeEvent<HTMLTextAreaElement>
                      ) =>
                        setHandoverDetails(
                          event.target.value
                        )
                      }
                      placeholder="Enter patient handover status or covering physician name..."
                      className="
                        min-h-[96px]
                        w-full
                        resize-y
                        rounded-[2px]
                        border
                        border-[#c3c6d5]
                        bg-white
                        px-[13px]
                        py-[13px]
                        text-[16px]
                        leading-6
                        text-[#191c1d]
                        outline-none
                        placeholder:text-[#6b7280]
                        focus:border-[#00327d]
                        focus:ring-1
                        focus:ring-[#00327d]
                      "
                    />

                  </div>


                  {/* =========================================
                      ACTIONS
                  ========================================== */}

                  <div className="flex w-full flex-col-reverse justify-end gap-4 pt-4 sm:flex-row">

                    <button
                      type="button"
                      onClick={handleCancel}
                      className="
                        min-h-[42px]
                        rounded-[2px]
                        border
                        border-[#c3c6d5]
                        bg-white
                        px-[25px]
                        py-[9px]
                        text-[16px]
                        font-bold
                        leading-6
                        text-[#00327d]
                        transition
                        hover:bg-[#f6f8fb]
                        active:translate-y-px
                      "
                    >
                      Cancel
                    </button>


                    <button
                      type="submit"
                      className="
                        flex
                        min-h-[42px]
                        items-center
                        justify-center
                        gap-2
                        rounded-[2px]
                        border
                        border-[#00327d]
                        bg-[#00327d]
                        px-6
                        py-[9px]
                        text-[16px]
                        font-bold
                        leading-6
                        text-white
                        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]
                        transition
                        hover:bg-[#00285f]
                        active:translate-y-px
                      "
                    >

                      <span>
                        Confirm Absence
                      </span>

                      <img
                        src="https://www.figma.com/api/mcp/asset/098c2568-c17a-42f9-9a7a-72030db32759.svg"
                        alt=""
                        className="h-[15px] w-[15px]"
                      />

                    </button>

                  </div>

                </form>

              </section>


              {/* =================================================
                  LOGGED ABSENCES
              ================================================== */}

              <section className="overflow-hidden rounded-[4px] border border-[#c3c6d5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">

                <div className="flex h-[61px] items-center justify-between border-b border-[#c3c6d5] px-6">

                  <h2 className="text-[18px] font-medium leading-6 text-[#191c1d]">
                    Logged Absences
                  </h2>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="text-[12px] font-bold leading-4 tracking-[0.6px] text-[#00327d] hover:underline"
                  >
                    Download Archive
                  </button>

                </div>


                {/* Table */}

                <div className="w-full overflow-x-auto">

                  <table className="w-full min-w-[650px] border-collapse">

                    <thead className="bg-[#edeeef]">

                      <tr>

                        <th className="h-10 px-6 py-3 text-left text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Absence Type
                        </th>

                        <th className="h-10 px-6 py-3 text-left text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Duration
                        </th>

                        <th className="h-10 px-6 py-3 text-left text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Date Logged
                        </th>

                        <th className="h-10 px-6 py-3 text-right text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Actions
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {loggedAbsences.map(
                        (
                          absence: LoggedAbsence
                        ) => (
                          <tr key={absence.type}>

                            <td className="h-14 border-b border-[#c3c6d5] px-6 py-4 text-[14px] leading-5 text-[#191c1d]">

                              <div className="flex items-center gap-2 whitespace-nowrap">

                                <img
                                  src={absence.icon}
                                  alt=""
                                  className="h-[15px] w-[15px] object-contain"
                                />

                                <span>
                                  {absence.type}
                                </span>

                              </div>

                            </td>


                            <td className="h-14 border-b border-[#c3c6d5] px-6 py-4 text-[14px] leading-5 text-[#191c1d]">

                              {absence.duration}

                            </td>


                            <td className="h-14 border-b border-[#c3c6d5] px-6 py-4 text-[14px] leading-5 text-[#434653]">

                              {absence.date}

                            </td>


                            <td className="h-14 border-b border-[#c3c6d5] px-6 py-4 text-right">

                              <button
                                type="button"
                                title="View absence"
                                onClick={() =>
                                  showToast(
                                    `Viewing ${absence.type} absence.`
                                  )
                                }
                                className="inline-flex items-center justify-center"
                              >

                                <img
                                  src="https://www.figma.com/api/mcp/asset/eeb68661-6bbd-410f-9112-78c5df575306.svg"
                                  alt="View"
                                  className="h-[15px] w-[22px] object-contain transition hover:scale-105"
                                />

                              </button>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>

            </section>


            {/* =================================================
                RIGHT COLUMN
            ================================================== */}

            <aside className="flex flex-col gap-6 lg:col-span-4">


              {/* =================================================
                  RETURN TO WORK CHECKLIST
              ================================================== */}

              <section className="rounded-[4px] border border-[#c3c6d5] border-l-4 border-l-[#00327d]/20 bg-white px-6 py-6 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">

                <div className="flex flex-col gap-4">

                  <div className="flex items-center gap-2">

                    <img
                      src="https://www.figma.com/api/mcp/asset/bae62b77-3cae-4adc-8201-ca5ab55f97d4.svg"
                      alt=""
                      className="h-[18px] w-5 object-contain"
                    />

                    <h2 className="whitespace-nowrap text-[18px] font-medium leading-6 text-[#191c1d]">
                      Return to Work Checklist
                    </h2>

                  </div>


                  <div className="flex flex-col gap-3">

                    {/* Handover */}

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={
                          checklist.handover
                        }
                        onChange={() =>
                          toggleChecklist(
                            "handover"
                          )
                        }
                        className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded-[2px] border-[#c3c6d5] accent-[#00327d]"
                      />

                      <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-[#191c1d]">
                        Handover notes completed
                      </span>

                    </label>


                    {/* Followups */}

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={
                          checklist.followups
                        }
                        onChange={() =>
                          toggleChecklist(
                            "followups"
                          )
                        }
                        className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded-[2px] border-[#c3c6d5] accent-[#00327d]"
                      />

                      <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-[#191c1d]">
                        Patient follow-ups scheduled
                      </span>

                    </label>


                    {/* EMR */}

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={checklist.emr}
                        onChange={() =>
                          toggleChecklist("emr")
                        }
                        className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded-[2px] border-[#c3c6d5] accent-[#00327d]"
                      />

                      <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-[#191c1d]">
                        EMR updates finalized
                      </span>

                    </label>


                    {/* Cover */}

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={checklist.cover}
                        onChange={() =>
                          toggleChecklist("cover")
                        }
                        className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded-[2px] border-[#c3c6d5] accent-[#00327d]"
                      />

                      <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-[#191c1d]">
                        Shift cover confirmed
                      </span>

                    </label>

                  </div>

                </div>

              </section>


              {/* =================================================
                  ANNUAL ENTITLEMENT
              ================================================== */}

              <section className="rounded-[4px] border border-[#c3c6d5] bg-white p-6 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">

                <h2 className="text-[12px] font-semibold leading-4 tracking-[1.2px] text-[#434653]">
                  ANNUAL ENTITLEMENT
                </h2>


                <div className="mt-6 flex flex-col gap-6">

                  {/* Vacation */}

                  <div className="flex flex-col gap-2">

                    <div className="flex items-end justify-between">

                      <span className="text-[16px] font-medium leading-6 text-[#191c1d]">
                        Vacation
                      </span>

                      <span className="text-[16px] font-bold leading-6 text-[#00327d]">
                        12 / 20 Days
                      </span>

                    </div>


                    <div className="h-2 w-full overflow-hidden rounded-xl bg-[#edeeef]">

                      <div className="h-full w-[60%] rounded-xl bg-[#00327d]" />

                    </div>

                  </div>


                  {/* Sick Leave */}

                  <div className="flex flex-col gap-2">

                    <div className="flex items-end justify-between">

                      <span className="text-[16px] font-medium leading-6 text-[#191c1d]">
                        Sick Leave
                      </span>

                      <span className="text-[16px] font-bold leading-6 text-[#434653]">
                        5 / 10 Days
                      </span>

                    </div>


                    <div className="h-2 w-full overflow-hidden rounded-xl bg-[#edeeef]">

                      <div className="h-full w-1/2 rounded-xl bg-[#575f6b]" />

                    </div>

                  </div>

                </div>

              </section>

            </aside>

          </main>

        </div>

      </div>


      {/* =====================================================
          TOAST
      ====================================================== */}

      {toast && (
        <div
          className="
            fixed
            bottom-6
            right-6
            z-[1000]
            min-w-[280px]
            rounded-[4px]
            bg-[#00327d]
            px-[18px]
            py-[14px]
            text-[14px]
            leading-5
            text-white
            shadow-[0_8px_24px_rgba(0,0,0,0.2)]
          "
        >
          {toast}
        </div>
      )}

    </div>
  );
};

export default AbsenceManagement;