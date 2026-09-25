package com.utp.horario.infrastructure.persistence.repository;

import com.utp.horario.infrastructure.persistence.entity.MarketplaceItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpringDataMarketplaceRepository extends JpaRepository<MarketplaceItemEntity, String> {
    List<MarketplaceItemEntity> findByCategoryIgnoreCase(String category);
    List<MarketplaceItemEntity> findAllByOrderByCreatedAtDesc();
}
