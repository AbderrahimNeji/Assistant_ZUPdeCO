import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { TrackingOccurrenceList } from './TrackingOccurrenceList';
import { TrackingUserList } from './TrackingUserList';
import {
  getTrackingOccurrences,
  getTrackingUsers,
  forceCompleteForUser,
} from '@/services/post-its.service';
import type { TrackingOccurrence, PostItStatus } from '@/types/post-it.types';

interface TrackingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateTitle: string;
}

export function TrackingDrawer({
  isOpen,
  onClose,
  templateId,
  templateTitle,
}: TrackingDrawerProps) {
  const queryClient = useQueryClient();
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PostItStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const pageSize = 50;

  const { data: occurrences, isLoading: loadingOccurrences } = useQuery({
    queryKey: ['tracking-occurrences', templateId],
    queryFn: () => getTrackingOccurrences(templateId),
    enabled: isOpen,
  });

  const currentOccurrence = (() => {
    if (!occurrences?.length) return undefined;
    const now = new Date();

    // 1. Occurrence provisionnée dont la fin est >= aujourd'hui (on est dans la période), la plus proche
    const currentProvisioned = occurrences
      .filter((o) => o.provisioned && new Date(o.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    if (currentProvisioned) return currentProvisioned;

    // 2. Occurrence provisionnée la plus récente dans le passé
    const mostRecentPast = occurrences
      .filter((o) => o.provisioned && new Date(o.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (mostRecentPast) return mostRecentPast;

    // 3. Occurrence future la plus proche (même non provisionnée)
    const closestFuture = occurrences
      .filter((o) => new Date(o.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return closestFuture ?? occurrences[occurrences.length - 1];
  })();

  const effectivePeriodKey = selectedPeriodKey ?? currentOccurrence?.periodKey ?? null;

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: [
      'tracking-users',
      templateId,
      effectivePeriodKey,
      statusFilter,
      searchQuery,
      currentPage,
    ],
    queryFn: () =>
      getTrackingUsers(templateId, {
        periodKey: effectivePeriodKey!,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        page: currentPage,
        pageSize,
      }),
    enabled: isOpen && effectivePeriodKey !== null,
  });

  const forceCompleteMutation = useMutation({
    mutationFn: ({ userId, periodKey }: { userId: string; periodKey: string }) =>
      forceCompleteForUser(templateId, userId, periodKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-occurrences', templateId] });
      queryClient.invalidateQueries({ queryKey: ['tracking-users', templateId] });
    },
  });

  const handleOccurrenceSelect = (occurrence: TrackingOccurrence) => {
    setSelectedPeriodKey(occurrence.periodKey);
    setCurrentPage(1);
  };

  const handleForceComplete = async (userId: string) => {
    if (!effectivePeriodKey) return;
    setLoadingUserId(userId);
    try {
      await forceCompleteMutation.mutateAsync({ userId, periodKey: effectivePeriodKey });
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: PostItStatus | 'all') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  return (
    <BaseModal
      open={isOpen}
      onClose={onClose}
      size="2xl"
      header={{
        title: 'Suivi des assignations',
        subtitle: templateTitle,
      }}
      compactPadding
      className="[&_[role=dialog]]:max-h-[85vh]"
    >
      <div className="flex h-[calc(85vh-180px)] overflow-hidden">
        <div className="w-64 border-r flex flex-col bg-muted/10">
          <TrackingOccurrenceList
            occurrences={occurrences ?? []}
            isLoading={loadingOccurrences}
            selectedPeriodKey={effectivePeriodKey}
            onSelect={handleOccurrenceSelect}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <TrackingUserList
            users={usersData?.users ?? []}
            total={usersData?.total ?? 0}
            page={currentPage}
            pageSize={pageSize}
            isLoading={loadingUsers}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onStatusFilter={handleStatusFilter}
            onPageChange={setCurrentPage}
            onForceComplete={handleForceComplete}
            loadingUserId={loadingUserId}
            selectedOccurrence={
              occurrences?.find((o) => o.periodKey === effectivePeriodKey) ?? null
            }
          />
        </div>
      </div>
    </BaseModal>
  );
}
