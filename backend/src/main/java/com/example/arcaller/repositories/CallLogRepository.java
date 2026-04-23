package com.example.arcaller.repositories;

import com.example.arcaller.models.CallLog;
import com.example.arcaller.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CallLogRepository extends JpaRepository<CallLog, Long> {
    List<CallLog> findByUserOrderByCallDateDesc(User user);
}
