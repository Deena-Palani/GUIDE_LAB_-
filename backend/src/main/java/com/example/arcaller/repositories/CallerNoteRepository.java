package com.example.arcaller.repositories;

import com.example.arcaller.models.CallerNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface CallerNoteRepository extends JpaRepository<CallerNote, Long> {

    // 1. Top 3 reasons (end_actions) for pending calls
    @Query(value = "SELECT end_action as reason, COUNT(*) as count FROM caller_notes WHERE status = 'Pending' GROUP BY end_action ORDER BY count DESC LIMIT 3", nativeQuery = true)
    List<Map<String, Object>> findTopPendingReasons();

    // 2. High-value accounts
    @Query(value = "SELECT id, caller_id, billed_amount, (billed_amount - balance) as collected, balance FROM caller_notes ORDER BY billed_amount DESC LIMIT 5", nativeQuery = true)
    List<Map<String, Object>> findHighValueAccounts();

    // 3. Balance trends (e.g., grouped by DOS month/year or just simple agg)
    @Query(value = "SELECT FORMATDATETIME(dos, 'yyyy-MM') as period, SUM(balance) as total_balance FROM caller_notes GROUP BY FORMATDATETIME(dos, 'yyyy-MM') ORDER BY period", nativeQuery = true)
    List<Map<String, Object>> findBalanceTrends();
}
