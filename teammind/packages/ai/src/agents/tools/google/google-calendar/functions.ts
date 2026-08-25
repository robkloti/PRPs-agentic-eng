import { calendar_v3 } from 'googleapis';

/**
 * Interface for arguments passed to the createCalendarEvent function,
 * matching the parameters defined in createCalendarEventDeclaration.
 */
interface CreateCalendarEventArgs {
  summary: string;
  startTime: string; // ISO 8601 format (e.g., "2025-04-07T10:00:00Z" or "2025-04-07T10:00:00+02:00")
  endTime: string; // ISO 8601 format
  attendees?: string[]; // Optional list of email addresses
  description?: string; // Optional
  location?: string; // Optional
  timeZone?: string; // Optional IANA Time Zone ID
}

/**
 * Creates a Google Calendar event using the provided arguments and calendar client.
 * Corresponds to the 'create_calendar_event' Gemini function declaration.
 *
 * @param args The event details parsed from the Gemini function call.
 * @param calendar Authenticated Google Calendar API client instance.
 * @param calendarId The ID of the calendar to add the event to (e.g., 'primary').
 * @returns An object indicating success or failure, including the event link if successful.
 */
export async function createCalendarEvent(
  args: CreateCalendarEventArgs,
  calendar: calendar_v3.Calendar,
  calendarId: string,
): Promise<{ success: boolean; message: string; eventLink?: string }> {
  const event: calendar_v3.Schema$Event = {
    summary: args.summary,
    location: args.location,
    description: args.description,
    start: {
      // Google Calendar API expects dateTime in RFC3339 format.
      // If timeZone is provided in args, use it explicitly. Otherwise,
      // rely on the offset within the dateTime string or the calendar's default.
      dateTime: args.startTime,
      ...(args.timeZone && { timeZone: args.timeZone }),
    },
    end: {
      dateTime: args.endTime,
      ...(args.timeZone && { timeZone: args.timeZone }),
    },
    attendees: args.attendees?.map((email) => ({ email })), // Map emails to attendee objects
  };

  try {
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendNotifications: true, // Optionally send notifications to attendees
    });

    if (response.status === 200 && response.data.htmlLink) {
      return {
        success: true,
        message: `Event created successfully.`,
        eventLink: response.data.htmlLink,
      };
    } else {
      return {
        success: false,
        message: `Failed to create event. Status: ${response.status}`,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error creating calendar event:', message);

    return {
      success: false,
      message: `An error occurred creating the event: ${message}`,
    };
  }
}

/**
 * Interface for the structured result returned by viewCalendarEvents.
 */
interface CalendarEventResult {
  id?: string | null;
  status?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: calendar_v3.Schema$EventDateTime;
  end?: calendar_v3.Schema$EventDateTime;
  attendees?: (string | null | undefined)[]; // Array of emails
  organizer?: string | null;
  htmlLink?: string | null;
}

/**
 * Interface for arguments passed to the viewCalendarEvents function,
 * matching the parameters defined in viewCalendarEventsDeclaration.
 */
interface ViewCalendarEventArgs {
  startTime?: string; // Optional ISO 8601 format
  endTime?: string; // Optional ISO 8601 format
  maxResults?: number; // Optional
  timeZone?: string; // Optional IANA Time Zone ID
}

/**
 * Retrieves Google Calendar events using the provided arguments and calendar client.
 * Corresponds to the 'view_calendar_events' Gemini function declaration.
 *
 * @param args The event filtering details parsed from the Gemini function call.
 * @param calendar Authenticated Google Calendar API client instance.
 * @param calendarId The ID of the calendar to view events from (e.g., 'primary').
 * @returns An object indicating success or failure, including the list of events if successful.
 */
export async function viewCalendarEvents(
  args: ViewCalendarEventArgs,
  calendar: calendar_v3.Calendar,
  calendarId: string,
): Promise<{
  success: boolean;
  message: string;
  events?: CalendarEventResult[];
}> {
  // Set defaults if arguments are not provided
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ); // End of day

  const timeMin = args.startTime ?? todayStart.toISOString();
  const timeMax = args.endTime ?? todayEnd.toISOString();
  const maxResults = args.maxResults ?? 10;
  const timeZone = args.timeZone; // Extract timezone from args

  try {
    // Conditionally add timeZone to the API call parameters
    const listParams: calendar_v3.Params$Resource$Events$List = {
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      maxResults: maxResults,
      singleEvents: true, // Expand recurring events into single instances
      orderBy: 'startTime', // Order events by start time
      ...(timeZone && { timeZone: timeZone }), // Add timeZone if provided
    };

    const response = await calendar.events.list(listParams);

    if (response.status === 200 && response.data.items) {
      // Curate the response to include relevant details
      const curatedItems = response.data.items.map((item) => ({
        id: item.id,
        status: item.status,
        summary: item.summary,
        description: item.description,
        location: item.location,
        start: item.start, // Contains dateTime or date
        end: item.end, // Contains dateTime or date
        attendees: item.attendees?.map(
          (att: calendar_v3.Schema$EventAttendee) => att.email as string,
        ), // Extract emails
        organizer: item.organizer?.email,
        htmlLink: item.htmlLink,
      }));

      return {
        success: true,
        message: `Found ${curatedItems.length} events.`,
        events: curatedItems,
      };
    } else if (response.status === 200) {
      return {
        success: true,
        message: 'No events found for the specified time range.',
        events: [],
      };
    } else {
      return {
        success: false,
        message: `Failed to retrieve events. Status: ${response.status}`,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error retrieving calendar events:', message);

    return {
      success: false,
      message: `An error occurred retrieving events: ${message}`,
    };
  }
}
