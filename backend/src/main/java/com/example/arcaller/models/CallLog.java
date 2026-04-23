package com.example.arcaller.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "call_logs")
@NoArgsConstructor
@AllArgsConstructor
public class CallLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @NotNull
    private LocalDateTime callDate;

    private String payerName;
    private String repName;
    private String callReference;
    private String fin;
    
    @Column(length = 1000)
    private String notes;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDateTime getCallDate() { return callDate; }
    public void setCallDate(LocalDateTime callDate) { this.callDate = callDate; }

    public String getPayerName() { return payerName; }
    public void setPayerName(String payerName) { this.payerName = payerName; }

    public String getRepName() { return repName; }
    public void setRepName(String repName) { this.repName = repName; }

    public String getCallReference() { return callReference; }
    public void setCallReference(String callReference) { this.callReference = callReference; }

    public String getFin() { return fin; }
    public void setFin(String fin) { this.fin = fin; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
