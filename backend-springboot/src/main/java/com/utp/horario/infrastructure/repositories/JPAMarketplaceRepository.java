package com.utp.horario.infrastructure.repositories;

import com.utp.horario.infrastructure.entities.MarketplaceItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JPAMarketplaceRepository extends JpaRepository<MarketplaceItemEntity, String> {
    List<MarketplaceItemEntity> findByCategoryIgnoreCase(String category);
    List<MarketplaceItemEntity> findAllByOrderByCreatedAtDesc();
}

