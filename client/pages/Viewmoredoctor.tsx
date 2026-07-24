import React from "react";

interface TableRow {
  role?: string;
  hospital?: string;
  degree?: string;
  university?: string;
  certificate?: string;
  from: string;
  to: string;
}

interface Doctor {
  name: string;
  username: string;
  phone: string;
  emergency: string;
  alternate: string;
  department: string;
  email: string;
  dob: string;
  experience: string;
  license: string;
  shift: string;
  bloodGroup: string;
  maritalStatus: string;
  language: string;
  gender: string;
  nationality: string;
  religion: string;
  joining: string;
  leaving: string;
  pan: string;
  aadhaar: string;
  motherTongue: string;
  bio: string;
}

const doctor: Doctor = {
  name: "John Smith",
  username: "DOC-9042",
  phone: "+91 90020 90456",
  emergency: "+91 90220 22352",
  alternate: "+91 90020 92352",
  department: "Cardiology",
  email: "john@gmail.com",
  dob: "01/25/1990",
  experience: "12",
  license: "ML566659898",
  shift: "Morning",
  bloodGroup: "A1B+",
  maritalStatus: "Married",
  language: "English, Tamil",
  gender: "Male",
  nationality: "Indian",
  religion: "Hindu",
  joining: "10/20/2008",
  leaving: "-",
  pan: "HASHJ239PN",
  aadhaar: "5666 5989 8290",
  motherTongue: "Tamil",
  bio: "About Doctor",
};

const experienceData: TableRow[] = [
  {
    role: "Cardiologist",
    hospital: "Central Hospital",
    from: "01/01/2018",
    to: "31/12/2022",
  },
];

const educationData: TableRow[] = [
  {
    degree: "MBBS, MD (Cardiology)",
    university: "ABC University",
    from: "01/07/2007",
    to: "30/06/2012",
  },
];

const certificationData: TableRow[] = [
  {
    certificate: "Fellowship in Interventional Cardiology",
    from: "01/01/2013",
    to: "31/12/2013",
  },
];

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div>
    <p className="text-sm font-semibold text-gray-900">{label}</p>
    <p className="mt-1 text-gray-600">{value}</p>
  </div>
);

const Card = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm mb-6">
    <div className="border-b border-gray-200 px-6 py-4">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>

    <div className="p-6">{children}</div>
  </div>
);

const ViewDoctor = () => {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}

        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-white hover:bg-gray-100"
          >
            ←
          </button>

          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              View Doctor
            </h1>

            <p className="text-gray-500">
              View full doctor profile
            </p>
          </div>
        </div>

        {/* Contact */}

        <Card title="Contact Information">

          <div className="flex flex-col gap-8 border-b pb-8 md:flex-row">

            <img
              src="https://i.pravatar.cc/150?img=12"
              alt="doctor"
              className="h-24 w-24 rounded-full border-4 border-gray-200 object-cover"
            />

            <div className="flex-1">

              <h2 className="mb-6 text-4xl font-bold">
                {doctor.name}
              </h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

                <InfoItem
                  label="Username"
                  value={doctor.username}
                />

                <InfoItem
                  label="Phone Number"
                  value={doctor.phone}
                />

                <InfoItem
                  label="Emergency Number"
                  value={doctor.emergency}
                />

                <InfoItem
                  label="Alternative Number"
                  value={doctor.alternate}
                />

              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">

                <InfoItem
                  label="Department"
                  value={doctor.department}
                />

                <InfoItem
                  label="Email"
                  value={doctor.email}
                />

              </div>
                            {/* Doctor Information */}

              <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2 xl:grid-cols-4">

                <InfoItem
                  label="DOB"
                  value={doctor.dob}
                />

                <InfoItem
                  label="Year Of Experience"
                  value={doctor.experience}
                />

                <InfoItem
                  label="Medical License Number"
                  value={doctor.license}
                />

                <div />

                <InfoItem
                  label="Department"
                  value={doctor.department}
                />

                <InfoItem
                  label="Shift"
                  value={doctor.shift}
                />

                <InfoItem
                  label="Blood Group"
                  value={doctor.bloodGroup}
                />

                <InfoItem
                  label="Marital Status"
                  value={doctor.maritalStatus}
                />

                <InfoItem
                  label="Language Spoken"
                  value={doctor.language}
                />

                <InfoItem
                  label="Gender"
                  value={doctor.gender}
                />

                <InfoItem
                  label="Nationality"
                  value={doctor.nationality}
                />

                <InfoItem
                  label="Religion"
                  value={doctor.religion}
                />

                <InfoItem
                  label="Date of Joining"
                  value={doctor.joining}
                />

                <InfoItem
                  label="Date of Leaving"
                  value={doctor.leaving}
                />

                <InfoItem
                  label="PAN Card"
                  value={doctor.pan}
                />

                <InfoItem
                  label="Aadhaar Card"
                  value={doctor.aadhaar}
                />

                <InfoItem
                  label="Mother Tongue"
                  value={doctor.motherTongue}
                />

                <InfoItem
                  label="Bio"
                  value={doctor.bio}
                />

              </div>

            </div>

          </div>

        </Card>

        {/* Department & Role */}

        <Card title="Department & Role">

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

            <div className="border-r border-gray-200 pr-6">
              <p className="text-sm font-semibold text-gray-900">
                Specialist
              </p>

              <p className="mt-2 text-lg font-semibold">
                Cardiology
              </p>
            </div>

            <div className="border-r border-gray-200 pr-6">
              <p className="text-sm font-semibold text-gray-900">
                Experience
              </p>

              <p className="mt-2 text-lg font-semibold">
                12 Years
              </p>
            </div>

            <div className="border-r border-gray-200 pr-6">
              <p className="text-sm font-semibold text-gray-900">
                Surgical
              </p>

              <p className="mt-2 text-lg font-semibold">
                No
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Emergency Support
              </p>

              <p className="mt-2 text-lg font-semibold">
                Not Assigned
              </p>
            </div>

          </div>

        </Card>

        {/* Experience */}

        <Card title="Experience">

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-slate-50">

                <tr>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    Role
                  </th>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    Hospital / Clinic Name
                  </th>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    From
                  </th>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    To
                  </th>

                </tr>

              </thead>

              <tbody>

                {experienceData.map((item, index) => (

                  <tr key={index}>

                    <td className="border-b px-4 py-4">
                      {item.role}
                    </td>

                    <td className="border-b px-4 py-4">
                      {item.hospital}
                    </td>

                    <td className="border-b px-4 py-4">
                      {item.from}
                    </td>

                    <td className="border-b px-4 py-4">
                      {item.to}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </Card>
                {/* Educational Information */}

        <Card title="Educational Information">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    Educational Degree
                  </th>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    University
                  </th>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    From
                  </th>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    To
                  </th>
                </tr>
              </thead>

              <tbody>
                {educationData.map((item, index) => (
                  <tr key={index}>
                    <td className="border-b px-4 py-4">
                      {item.degree}
                    </td>

                    <td className="border-b px-4 py-4">
                      {item.university}
                    </td>

                    <td className="border-b px-4 py-4">
                      {item.from}
                    </td>

                    <td className="border-b px-4 py-4">
                      {item.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Certifications */}

        <Card title="Certifications">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    Name
                  </th>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    From
                  </th>

                  <th className="border-b px-4 py-3 text-left text-sm font-semibold">
                    To
                  </th>
                </tr>
              </thead>

              <tbody>
                {certificationData.map((item, index) => (
                  <tr key={index}>
                    <td className="border-b px-4 py-4">
                      {item.certificate}
                    </td>

                    <td className="border-b px-4 py-4">
                      {item.from}
                    </td>

                    <td className="border-b px-4 py-4">
                      {item.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Current Address */}

        <Card title="Current Address">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">

            <InfoItem
              label="Address"
              value="123, Green Avenue, Near City Hospital"
            />

            <InfoItem
              label="City"
              value="Bangalore"
            />

            <InfoItem
              label="State"
              value="Karnataka"
            />

          </div>
        </Card>

        {/* Permanent Address */}

        <Card title="Permanent Address">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">

            <InfoItem
              label="Address"
              value="123, Green Avenue, Near City Hospital"
            />

            <InfoItem
              label="City"
              value="Bangalore"
            />

            <InfoItem
              label="State"
              value="Karnataka"
            />

          </div>
        </Card>

      </div>
    </div>
  );
};

export default ViewDoctor;