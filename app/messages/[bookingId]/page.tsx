import BookingMessagesClient from "./BookingMessagesClient";

type PageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function BookingMessagesPage({ params }: PageProps) {
  const { bookingId } = await params;

  return <BookingMessagesClient bookingId={bookingId} />;
}