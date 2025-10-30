"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface HistoryItem {
  id: string;
  topic: string;
  details: string;
  timestamp: number;
}

const COLLECTION = "history";
const MAX_HISTORY_ITEMS = 10;

async function fetchHistory(uid: string): Promise<HistoryItem[]> {
  const q = query(
    collection(db, "users", uid, COLLECTION),
    orderBy("timestamp", "desc"),
    limit(MAX_HISTORY_ITEMS)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() as Omit<HistoryItem, "id">) }));
}

export function useHistory(uid?: string) {
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["history", uid],
    queryFn: () => fetchHistory(uid as string),
    enabled: !!uid,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: Omit<HistoryItem, "id">) => {
      if (!uid) throw new Error("Missing uid");
      await addDoc(collection(db, "users", uid, COLLECTION), payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history", uid] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Missing uid");
      const q = query(collection(db, "users", uid, COLLECTION));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => deleteDoc(doc(db, "users", uid, COLLECTION, d.id))));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history", uid] });
    },
  });

  const addHistoryItem = (topic: string, details: string) => {
    return addMutation.mutate({ topic, details, timestamp: Date.now() });
  };

  const clearHistory = () => clearMutation.mutate();

  return {
    history: data ?? [],
    isLoading,
    isError,
    addHistoryItem,
    clearHistory,
    refetch,
    isMutating: addMutation.isPending || clearMutation.isPending,
  };
}
