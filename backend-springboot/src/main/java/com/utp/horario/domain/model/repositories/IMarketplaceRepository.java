package com.utp.horario.domain.model.repositories;

import com.utp.horario.domain.model.aggregate.MarketplaceItem;

import java.util.List;

public interface IMarketplaceRepository extends ICRUD<MarketplaceItem, String> {
    List<MarketplaceItem> findByCategory(String category);
    List<MarketplaceItem> findByCourseCode(String courseCode);
    List<MarketplaceItem> findByStudentCode(String studentCode);
}
