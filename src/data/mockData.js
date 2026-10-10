// FieldSync enterprise dispatcher mock data matching the ServiceNow reference screenshot
// and FieldSync offline-first conflict resolution specifications.

export const INITIAL_PENDING_TASKS = [
  {
    id: "WOT00100270",
    ticketId: "WO-102",
    title: "Break Fix",
    site: "San Francisco Technicians",
    location: "Financial District - 555 California St",
    priority: "High",
    status: "Pending Dispatch",
    equipmentId: "PUMP-204",
    sla: "2 hours",
    durationHours: 2.0,
    requiredSkills: ["Hydraulics", "SLA Critical"],
    requiredParts: [{ partId: "VALVE-V10", name: "High-Pressure Seal Valve", qty: 1 }],
    diagnosticNotes: "Hydraulic pump pressure drop detected on sub-floor 3.",
    version: 1,
    coordinates: { lat: 37.7925, lng: -122.4035 }, // Financial District
    hasConflict: false,
  },
  {
    id: "WOT00100259",
    ticketId: "WO-103",
    title: "Multi Day - Cell tower installation",
    site: "San Francisco Technicians",
    location: "Twin Peaks Radio Site",
    priority: "Moderate",
    status: "Pending Dispatch",
    equipmentId: "TWR-880",
    sla: "48 hours",
    durationHours: 4.5,
    requiredSkills: ["Fiber Optics", "High Voltage"],
    requiredParts: [{ partId: "ANT-5G", name: "5G Beamformer Array", qty: 2 }],
    diagnosticNotes: "Phase 1 structural mount completed; wiring pending.",
    version: 1,
    coordinates: { lat: 37.7544, lng: -122.4477 }, // Twin Peaks
    hasConflict: false,
  },
  {
    id: "WOT00100207",
    ticketId: "WO-101",
    title: "Camera Malfunction in Vital Operational Zone",
    site: "San Francisco Technicians",
    location: "Port of San Francisco - Pier 39 Security",
    priority: "Critical",
    status: "Pending Dispatch",
    equipmentId: "CAM-OPT-99",
    sla: "45 minutes",
    durationHours: 2.5,
    requiredSkills: ["Optical Systems", "CCTV", "Sensors"],
    requiredParts: [
      { partId: "SENSOR-S20", name: "Optical Thermal Sensor", qty: 4 }
    ],
    consumedParts: [
      { technicianId: "TECH-A (Alex)", qty: 4, timestamp: "2024-11-28T09:15:00Z" },
      { technicianId: "TECH-B (Teddy)", qty: 3, timestamp: "2024-11-28T09:20:00Z" }
    ],
    diagnosticNotes: "Video stream corrupted; IR sensor optic lens unresponsive.",
    version: 2,
    coordinates: { lat: 37.8087, lng: -122.4098 }, // Pier 39 / Fisherman's Wharf
    hasConflict: true,
    conflictDetails: {
      type: "INVENTORY_SHORTAGE",
      description: "Concurrent offline reports consume 7 units of SENSOR-S20 (Authoritative stock is 5).",
      ruleId: "RULE_D_INVENTORY_SHORTAGE",
      needsSupervisorReview: true,
    }
  }
];

export const TECHNICIANS = [
  {
    id: "TECH-001",
    name: "Alex Ray",
    role: "Senior Field Specialist",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    initials: "AR",
    status: "Available",
    phone: "+1 (415) 555-0182",
    skills: ["Optical Systems", "Hydraulics", "SLA Critical"],
    currentLocation: "Presidio Heights",
    coordinates: { lat: 37.7886, lng: -122.4532 },
    locationTimestamp: "2024-11-28T09:40:00Z",
    schedule: [
      {
        id: "SCH-101",
        taskId: "WOT00100195",
        title: "Replace intake cable",
        startHour: 8.0,
        durationHours: 2.75, // 08:00 - 10:45
        status: "In Progress",
        type: "wrench",
        color: "lavender",
        location: "Marina District - Bay St",
        coordinates: { lat: 37.8025, lng: -122.4382 },
      }
    ]
  },
  {
    id: "TECH-002",
    name: "Alisa Chinoy",
    role: "HVAC & Electrical Tech",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face",
    initials: "AC",
    status: "En Route",
    phone: "+1 (415) 555-0193",
    skills: ["Sensors", "Alarms", "CCTV"],
    currentLocation: "Pacific Heights",
    coordinates: { lat: 37.7925, lng: -122.4352 },
    locationTimestamp: "2024-11-28T09:35:00Z",
    schedule: [
      {
        id: "SCH-102",
        taskId: "WOT00100268",
        title: "Motion Detection Malfunction",
        startHour: 12.25, // 12:15 - 14:15
        durationHours: 2.0,
        status: "Scheduled",
        priority: "P1",
        type: "alert",
        color: "lavender",
        travelMinutes: 25,
        location: "Union Square Plaza",
        coordinates: { lat: 37.7879, lng: -122.4075 },
      }
    ]
  },
  {
    id: "TECH-003",
    name: "Anthony Roy",
    role: "Automation Engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    initials: "AR",
    status: "Busy",
    phone: "+1 (415) 555-0144",
    skills: ["Paired Sensors", "Robotics"],
    currentLocation: "Outer Sunset",
    coordinates: { lat: 37.7562, lng: -122.5015 },
    locationTimestamp: "2024-11-28T09:22:00Z",
    schedule: [
      {
        id: "SCH-103",
        taskId: "WOT00100196",
        title: "Replace Paired Sensors",
        startHour: 8.25, // 08:15 - 10:45
        durationHours: 2.5,
        status: "Completed",
        type: "wrench",
        color: "lavender",
        travelMinutes: 15,
        location: "Ocean Beach Control",
        coordinates: { lat: 37.7690, lng: -122.4862 },
      }
    ]
  },
  {
    id: "TECH-004",
    name: "Cindy Lisa",
    role: "Network Infrastructure Specialist",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    initials: "CL",
    status: "Available",
    phone: "+1 (415) 555-0177",
    skills: ["Fiber Optics", "Modems", "Cisco"],
    currentLocation: "Mission District",
    coordinates: { lat: 37.7599, lng: -122.4148 },
    locationTimestamp: "2024-11-28T09:42:00Z",
    schedule: [
      {
        id: "SCH-104",
        taskId: "WOT00100193",
        title: "Router and Modem Upgrade",
        startHour: 13.25, // 13:15 - 15:15
        durationHours: 2.0,
        status: "Scheduled",
        type: "network",
        color: "lavender",
        travelMinutes: 20,
        location: "Mission St - Tech Hub",
        coordinates: { lat: 37.7621, lng: -122.4185 },
      }
    ]
  },
  {
    id: "TECH-005",
    name: "Gina Frost",
    role: "POS & Telecommunications Tech",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    initials: "GF",
    status: "Busy",
    phone: "+1 (415) 555-0129",
    skills: ["POS Terminals", "Routers"],
    currentLocation: "SOMA District",
    coordinates: { lat: 37.7812, lng: -122.4005 },
    locationTimestamp: "2024-11-28T09:38:00Z",
    schedule: [
      {
        id: "SCH-105",
        taskId: "WOT00100281",
        title: "Run Point of Sale",
        startHour: 10.0, // 10:00 - 11:15
        durationHours: 1.25,
        status: "Completed",
        type: "terminal",
        color: "lavender",
        travelMinutes: 20,
        location: "Market St Retail Center",
        coordinates: { lat: 37.7845, lng: -122.4065 },
      },
      {
        id: "SCH-106",
        taskId: "WOT00100282",
        title: "Router Set-up",
        startHour: 14.0, // 14:00 - 15:15
        durationHours: 1.25,
        status: "Scheduled",
        type: "network",
        color: "lavender",
        travelMinutes: 15,
        location: "Howard St Headquarters",
        coordinates: { lat: 37.7831, lng: -122.3980 },
      }
    ]
  },
  {
    id: "TECH-006",
    name: "Teddy Taylor",
    role: "Senior Network Engineer",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    initials: "TT",
    status: "In Field",
    phone: "+1 (415) 555-0155",
    skills: ["Fiber", "High Voltage", "Substations"],
    currentLocation: "Financial District",
    coordinates: { lat: 37.7952, lng: -122.4028 },
    locationTimestamp: "2024-11-28T09:45:00Z",
    schedule: [
      {
        id: "SCH-107",
        taskId: "WOT00100269",
        title: "Repair Network Line",
        startHour: 9.25, // 09:15 - 11:45
        durationHours: 2.5,
        status: "Active Work",
        type: "network",
        color: "teal", // Selected/Active Job matching screenshot
        travelMinutes: 30,
        location: "Transamerica Tower Annex",
        coordinates: { lat: 37.7940, lng: -122.4015 },
      }
    ]
  },
  {
    id: "TECH-007",
    name: "Inspection Crew",
    role: "Quality Assurance Unit",
    avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop&crop=face",
    initials: "IC",
    isCrew: true,
    membersCount: 2,
    status: "Available",
    phone: "+1 (415) 555-0199",
    skills: ["Safety Audit", "Certification"],
    currentLocation: "Civic Center",
    coordinates: { lat: 37.7792, lng: -122.4191 },
    locationTimestamp: "2024-11-28T09:30:00Z",
    schedule: [
      {
        id: "SCH-108",
        taskId: "WOT00100194",
        title: "Inspect the unit condition",
        startHour: 13.0, // 13:00 - 15:30
        durationHours: 2.5,
        status: "Scheduled",
        type: "clipboard",
        color: "lavender",
        location: "Van Ness Civic Center",
        coordinates: { lat: 37.7780, lng: -122.4170 },
      }
    ]
  }
];

// Additional geo-referenced active field work orders to populate OpenStreetMap
export const SCHEDULED_FIELD_TASKS = [
  {
    id: "WOT00100195",
    title: "Replace intake cable",
    location: "Marina District - Bay St",
    status: "In Progress",
    priority: "High",
    assignedTech: "Alex Ray",
    coordinates: { lat: 37.8025, lng: -122.4382 },
  },
  {
    id: "WOT00100268",
    title: "Motion Detection Malfunction",
    location: "Union Square Plaza",
    status: "Scheduled",
    priority: "P1", // Critical SLA
    assignedTech: "Alisa Chinoy",
    coordinates: { lat: 37.7879, lng: -122.4075 },
  },
  {
    id: "WOT00100196",
    title: "Replace Paired Sensors",
    location: "Ocean Beach Control",
    status: "Completed",
    priority: "Standard",
    assignedTech: "Anthony Roy",
    coordinates: { lat: 37.7690, lng: -122.4862 },
  },
  {
    id: "WOT00100193",
    title: "Router and Modem Upgrade",
    location: "Mission St - Tech Hub",
    status: "Scheduled",
    priority: "Standard",
    assignedTech: "Cindy Lisa",
    coordinates: { lat: 37.7621, lng: -122.4185 },
  },
  {
    id: "WOT00100269",
    title: "Repair Network Line",
    location: "Transamerica Tower Annex",
    status: "Active Work",
    priority: "High",
    assignedTech: "Teddy Taylor",
    coordinates: { lat: 37.7940, lng: -122.4015 },
  },
  {
    id: "WOT00100194",
    title: "Inspect the unit condition",
    location: "Van Ness Civic Center",
    status: "Scheduled",
    priority: "Standard",
    assignedTech: "Inspection Crew",
    coordinates: { lat: 37.7780, lng: -122.4170 },
  }
];

export const ONBOARDING_TOUR_STEPS = [
  {
    step: 1,
    total: 5,
    title: "Dispatcher Workspace",
    description:
      "Dispatcher Workspace provides a single view of all work orders, technician availability, and SLAs. No more toggling between systems. From here, dispatcher Lisa Ray can assign jobs with one click, adjust schedules using AI, and monitor work progress—all in real time.",
    target: "workspace"
  },
  {
    step: 2,
    total: 5,
    title: "Pending Dispatch Queue",
    description:
      "Review urgent field requests waiting for assignment. Select work orders individually or in bulk, filter by SLA, and inspect required inventory parts before assigning.",
    target: "pending"
  },
  {
    step: 3,
    total: 5,
    title: "OpenStreetMap Geographic Console",
    description:
      "Interactive OpenStreetMap engine showing real-world streets, technician GPS telemetry, cluster indicators, and work order pins with straight-line distance recommendations.",
    target: "map"
  },
  {
    step: 4,
    total: 5,
    title: "Technician Timeline & Scheduling",
    description:
      "Schedule work orders along dynamic hourly time-blocks. See travel time lines, active tasks, technician availability, and crew assignments at a glance.",
    target: "timeline"
  },
  {
    step: 5,
    total: 5,
    title: "Offline Sync & Conflict Resolver",
    description:
      "FieldSync guarantees offline safety: when technicians submit competing edits or consume scarce inventory while offline, deterministic rules detect discrepancies for supervisor review.",
    target: "conflicts"
  }
];

export const INVENTORY_ITEMS = [
  {
    partId: "SENSOR-S20",
    name: "Optical Thermal Sensor",
    authoritativeStock: 5,
    allocated: 7, // Deficit of 2 due to concurrent offline reports
    unitCost: "$240.00",
    status: "DISCREPANCY_FLAGGED",
  },
  {
    partId: "VALVE-V10",
    name: "High-Pressure Seal Valve",
    authoritativeStock: 14,
    allocated: 1,
    unitCost: "$115.00",
    status: "IN_STOCK",
  },
  {
    partId: "ANT-5G",
    name: "5G Beamformer Array",
    authoritativeStock: 8,
    allocated: 2,
    unitCost: "$890.00",
    status: "IN_STOCK",
  }
];
