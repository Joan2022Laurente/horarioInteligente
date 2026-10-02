package com.utp.horario.infraestructure.adapters;

import com.utp.horario.domain.model.aggregate.MarketplaceItem;
import com.utp.horario.domain.model.repositories.IMarketplaceRepository;
import com.utp.horario.infraestructure.entities.MarketplaceItemEntity;
import com.utp.horario.infraestructure.mappers.MarketplaceMapper;
import com.utp.horario.infraestructure.repositories.JPAMarketplaceRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class MarketplaceRepositoryAdapter implements IMarketplaceRepository {

    private final JPAMarketplaceRepository jpa;
    private final MarketplaceMapper mapper;

    public MarketplaceRepositoryAdapter(JPAMarketplaceRepository jpa, MarketplaceMapper mapper) {
        this.jpa = jpa;
        this.mapper = mapper;
    }

    @Override
    public MarketplaceItem save(MarketplaceItem item) {
        MarketplaceItemEntity entity = mapper.toEntity(item);
        return mapper.toDomain(jpa.save(entity));
    }

    @Override
    public Optional<MarketplaceItem> findById(String id) {
        return jpa.findById(id).map(mapper::toDomain);
    }

    @Override
    public MarketplaceItem update(MarketplaceItem item) {
        return save(item);
    }

    @Override
    public List<MarketplaceItem> list() {
        return jpa.findAllByOrderByCreatedAtDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Boolean delete(String id) {
        if (jpa.existsById(id)) {
            jpa.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    public List<MarketplaceItem> findByCategory(String category) {
        return jpa.findByCategoryIgnoreCase(category).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<MarketplaceItem> findByCourseCode(String courseCode) {
        return jpa.findAll().stream()
                .filter(item -> item.getTitle() != null && item.getTitle().toUpperCase().contains(courseCode.toUpperCase()))
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<MarketplaceItem> findByStudentCode(String studentCode) {
        return jpa.findAll().stream()
                .filter(item -> item.getTutorName() != null && item.getTutorName().equalsIgnoreCase(studentCode))
                .map(mapper::toDomain)
                .toList();
    }
}
