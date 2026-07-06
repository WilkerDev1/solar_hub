'use client';

import React from 'react';
import KanbanBoard, { KanbanBoardProps } from '@/core/components/KanbanBoard';

export default function KanbanView(props: KanbanBoardProps) {
  return <KanbanBoard {...props} showProjectBadge={true} />;
}
