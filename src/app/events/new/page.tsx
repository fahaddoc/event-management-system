import { EventForm } from '@/components/EventForm'

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Create an event</h1>
        <p className="text-muted-foreground">
          Your event will be reviewed by an admin before it goes live.
        </p>
      </div>
      <EventForm mode="create" />
    </div>
  )
}
