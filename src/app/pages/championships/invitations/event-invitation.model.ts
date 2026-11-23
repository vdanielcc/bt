export interface EventInvitation {
  id: number;
  name: string;
  poster: string;
  eventDateCheckin: string;
  registrationClosesAtUtc?: string;
  presaleEndsAtUtc?: string;
  canOverrideRegistrationClose?: boolean;
  eventDateStart?: string;
  eventDateEnd?: string;
  eventLocation?: string;
  eventAddress?: string;
  eventLinkWaze?: string;
  eventLinkGmaps?: string;
  eventLinkOsmaps?: string;
  eventLinkSrcOsmaps?: string;
  eventLinkWhatsapp?: string;
  academyId?: number;
  coOrganizerAcademyIds?: number[];
  academyName?: string;
  feeTicket?: number;
  descriptions?: string;
  rulesDocument?: string;
  eventType?: string;
  associationType?: string;
  numberOfAreas?: number;
  days?: number;
  maxCategoriesPerRegistration?: number;
  factorList?: EventTicketFactor[];
}

export interface EventTicketFactor {
  type: string;
  description?: string;
  totalCategories: number;
  ticketValue: number;
}
