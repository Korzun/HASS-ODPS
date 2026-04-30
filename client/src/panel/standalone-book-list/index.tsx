import { BookCard } from '../../component/book-card';
import { CollapsibleSection } from '../../component/collapsible-section';
import { useStandaloneBookList } from '../../provider/book/hook';

export const StandaloneBookListPanel = () => {
  const [ bookList ] = useStandaloneBookList();
  const subTitle = `${bookList.length} book${bookList.length !== 1 ? 's' : ''}`;

  return (
    <CollapsibleSection title='Standalone Books' subTitle={subTitle}>
      {bookList.map(book => (
        <BookCard key={book.id} book={book}/>
      ))}
    </CollapsibleSection>
  );
}
