package com.utp.horario.application.service;

import com.utp.horario.domain.model.value_objets.DailyQuotaStatus;

public interface DailyQuotaService {
    DailyQuotaStatus checkQuota(String userIdentifier);
    DailyQuotaStatus consumeQuota(String userIdentifier);
    void resetQuota(String userIdentifier);
}
