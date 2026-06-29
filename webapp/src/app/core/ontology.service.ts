import { Injectable, signal } from '@angular/core';
import { Parser, Store, Quad, Term } from 'n3';

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const OWL = 'http://www.w3.org/2002/07/owl#';
const DCT = 'http://purl.org/dc/terms/';

const ONTOLOGY_URL = 'ontology/feminism-cinema.ttl';

/** Strip a namespace, returning the local fragment of an IRI. */
function local(iri: string): string {
  const i = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  return i >= 0 ? iri.slice(i + 1) : iri;
}

export interface OntClass {
  id: string;
  label: string;
  comment: string;
}
export interface OntProperty {
  id: string;
  label: string;
  domain: string;
  range: string;
  comment: string;
  functional: boolean;
}
export interface SubClass {
  sub: string;
  sup: string;
}
export interface Triple {
  s: string;
  p: string;
  o: string;
  literal: boolean;
}

@Injectable({ providedIn: 'root' })
export class OntologyService {
  private store = new Store();

  readonly loaded = signal(false);
  meta = { title: '', comment: '' };
  classes: OntClass[] = [];
  objectProperties: OntProperty[] = [];
  dataProperties: OntProperty[] = [];
  subClassOf: SubClass[] = [];
  /** Triples that describe the example individuals (A-Box). */
  exampleTriples: Triple[] = [];
  counts = { classes: 0, objectProperties: 0, dataProperties: 0, individuals: 0 };

  private promise?: Promise<void>;

  load(): Promise<void> {
    if (!this.promise) this.promise = this.doLoad();
    return this.promise;
  }

  private one(subject: string, predicate: string): string | undefined {
    const o = this.store.getObjects(subject, predicate, null);
    return o.length ? o[0].value : undefined;
  }

  private label(id: string): string {
    return this.one(id, RDFS + 'label') ?? local(id);
  }

  private async doLoad(): Promise<void> {
    const text = await fetch(ONTOLOGY_URL).then((r) => r.text());
    this.store.addQuads(new Parser().parse(text));

    // Ontology metadata
    const ont = this.store.getSubjects(RDF + 'type', OWL + 'Ontology', null)[0];
    if (ont) {
      this.meta = {
        title: this.one(ont.value, DCT + 'title') ?? 'Ontology',
        comment: this.one(ont.value, RDFS + 'comment') ?? '',
      };
    }

    const named = (iri: string): Term[] =>
      (this.store.getSubjects(RDF + 'type', iri, null) as Term[]).filter(
        (s) => s.termType === 'NamedNode',
      );

    // Classes
    this.classes = named(OWL + 'Class')
      .map((c) => ({
        id: c.value,
        label: this.label(c.value),
        comment: this.one(c.value, RDFS + 'comment') ?? '',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Helper to read a property definition
    const isFunctional = (id: string) =>
      this.store.getQuads(id, RDF + 'type', OWL + 'FunctionalProperty', null).length > 0;
    const propOf = (id: string): OntProperty => ({
      id,
      label: this.label(id),
      domain: local(this.one(id, RDFS + 'domain') ?? ''),
      range: local(this.one(id, RDFS + 'range') ?? ''),
      comment: this.one(id, RDFS + 'comment') ?? '',
      functional: isFunctional(id),
    });

    this.objectProperties = named(OWL + 'ObjectProperty')
      .map((p) => propOf(p.value))
      .sort((a, b) => a.label.localeCompare(b.label));

    this.dataProperties = named(OWL + 'DatatypeProperty')
      .map((p) => propOf(p.value))
      .sort((a, b) => a.label.localeCompare(b.label));

    // subClassOf edges (named class to named class)
    this.subClassOf = this.store
      .getQuads(null, RDFS + 'subClassOf', null, null)
      .filter(
        (q: Quad) =>
          q.subject.termType === 'NamedNode' && q.object.termType === 'NamedNode',
      )
      .map((q: Quad) => ({ sub: local(q.subject.value), sup: local(q.object.value) }));

    // Example individuals → triples (skip the controlled Gender values for clarity)
    const individuals = named(OWL + 'NamedIndividual');
    this.counts.individuals = individuals.length;

    const propIds = new Set(
      [...this.objectProperties, ...this.dataProperties].map((p) => p.id),
    );
    const isGenderIndividual = (id: string): boolean =>
      this.store
        .getQuads(id, RDF + 'type', null, null)
        .some((q: Quad) => local(q.object.value) === 'Gender');

    const triples: Triple[] = [];
    for (const ind of individuals) {
      if (isGenderIndividual(ind.value)) continue;
      for (const q of this.store.getQuads(ind.value, null, null, null)) {
        if (!propIds.has(q.predicate.value)) continue;
        triples.push({
          s: this.label(ind.value),
          p: this.label(q.predicate.value),
          o: q.object.termType === 'Literal' ? q.object.value : this.label(q.object.value),
          literal: q.object.termType === 'Literal',
        });
      }
    }
    // Nominations first, then the rest — keeps the central event on top.
    this.exampleTriples = triples.sort((a, b) => a.s.localeCompare(b.s));

    this.counts.classes = this.classes.length;
    this.counts.objectProperties = this.objectProperties.length;
    this.counts.dataProperties = this.dataProperties.length;

    this.loaded.set(true);
  }
}
