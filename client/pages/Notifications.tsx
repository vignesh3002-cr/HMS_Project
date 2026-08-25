import NotificationFeed from "@/components/Forms/view/Notification";

export default function Notifications() {
  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0 p-6">
        <div className="max-w-3xl w-full mx-auto">
          <NotificationFeed />
        </div>
      </div>
    </div>
  );
}
