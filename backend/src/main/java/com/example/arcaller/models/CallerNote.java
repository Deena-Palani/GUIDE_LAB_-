package com.example.arcaller.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

import java.util.List;

@Entity
@Table(name = "caller_notes")
@NoArgsConstructor
@AllArgsConstructor
public class CallerNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "caller_id")
    private String callerId;

    @NotNull
    private LocalDate dos;

    @NotNull
    private String fin;

    private String insurance;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "allocated_to_id")
    private User allocatedTo;

    @NotNull
    @Min(0)
    @Column(name = "billed_amount")
    private BigDecimal billedAmount;

    @NotNull
    @Min(0)
    private BigDecimal balance;

    @Column(name = "end_action")
    private String endAction;

    private String status;

    @OneToMany(mappedBy = "callerNote", cascade = CascadeType.ALL)
    private List<NoteHistory> history;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getCallerId() { return callerId; }
    public void setCallerId(String callerId) { this.callerId = callerId; }
    
    public LocalDate getDos() { return dos; }
    public void setDos(LocalDate dos) { this.dos = dos; }
    
    public String getFin() { return fin; }
    public void setFin(String fin) { this.fin = fin; }

    public String getInsurance() { return insurance; }
    public void setInsurance(String insurance) { this.insurance = insurance; }

    public User getAllocatedTo() { return allocatedTo; }
    public void setAllocatedTo(User allocatedTo) { this.allocatedTo = allocatedTo; }
    
    public BigDecimal getBilledAmount() { return billedAmount; }
    public void setBilledAmount(BigDecimal billedAmount) { this.billedAmount = billedAmount; }
    
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    
    public String getEndAction() { return endAction; }
    public void setEndAction(String endAction) { this.endAction = endAction; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<NoteHistory> getHistory() { return history; }
    public void setHistory(List<NoteHistory> history) { this.history = history; }
}
